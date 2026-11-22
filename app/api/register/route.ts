import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { registrationEnvironment } from '@/lib/env'
import { siteConfig } from '@/lib/config'
import { requestIp, hashIp } from '@/lib/ip'
import { checkRateLimit } from '@/lib/ratelimit'
import { verifyTurnstile } from '@/lib/turnstile'
import { registrationSchema } from '@/lib/schemas'
import { processImage, ImageError } from '@/lib/images'
import { generateCode } from '@/lib/code'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { uploadRegistrationImages, deleteRegistrationImages } from '@/lib/storage'
import { sendAdminNotification } from '@/lib/email/admin-notification'
import { sendMemberConfirmation } from '@/lib/email/member-confirmation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MAX_TOTAL_BYTES = 4.5 * 1024 * 1024 // 4.5MB request limit

export async function POST(request: Request) {
  // 0. Configuration check
  const { missing } = registrationEnvironment()
  if (missing.length) {
    console.warn(`[config] Registration disabled. Missing: ${missing.join(', ')}`)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'service_unavailable',
          message: 'Registration is temporarily unavailable. Please try again later.',
        },
      },
      { status: 503 }
    )
  }

  // 1. Content-Length check
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'payload_too_large',
          message: 'Upload exceeds maximum size limit of 4 MB.',
        },
      },
      { status: 413 }
    )
  }

  const ip = requestIp(request)

  // 3. Rate limiting (e.g. 5 registrations per hour per IP)
  const rateLimit = checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'rate_limited',
          message: 'Too many registration attempts. Please try again later.',
        },
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfter) },
      }
    )
  }

  // Parse multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'validation_failed',
          message: 'Could not parse registration data.',
        },
      },
      { status: 400 }
    )
  }

  // 2. Honeypot check: website field
  const honeypot = formData.get('website')
  if (honeypot && String(honeypot).trim().length > 0) {
    // Return fake success, store nothing, send nothing
    const fakeCode = generateCode(siteConfig.codePrefix)
    return NextResponse.json({
      ok: true,
      code: fakeCode,
      whatsappUrl: null,
      adminWhatsappUrl: null,
      memberEmailSent: true,
    })
  }

  // 4. Turnstile verification
  const turnstileToken = String(formData.get('turnstileToken') || '')
  const turnstileValid = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileValid) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'captcha_failed',
          message: 'Security verification failed. Please try again.',
        },
      },
      { status: 400 }
    )
  }

  // 5. Field validation with Zod
  const rawData = {
    fullName: String(formData.get('fullName') || ''),
    phone: String(formData.get('phone') || ''),
    email: String(formData.get('email') || ''),
    address: String(formData.get('address') || ''),
    state: String(formData.get('state') || ''),
    lga: String(formData.get('lga') || ''),
    consent: formData.get('consent') === 'true' || formData.get('consent') === 'on',
  }

  const parsed = registrationSchema.safeParse(rawData)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const fieldName = String(issue.path[0] || 'general')
      if (!fields[fieldName]) {
        fields[fieldName] = issue.message
      }
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'validation_failed',
          message: 'Please check the highlighted fields.',
          fields,
        },
      },
      { status: 400 }
    )
  }

  const validData = parsed.data

  // 6. File processing
  const voterCardFile = formData.get('voterCard')
  const photoFile = formData.get('photo')

  if (!voterCardFile || !(voterCardFile instanceof Blob)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'validation_failed',
          message: 'Please provide a photo of your voter’s card.',
          fields: { voterCard: 'Please provide a photo of your voter’s card.' },
        },
      },
      { status: 400 }
    )
  }

  if (!photoFile || !(photoFile instanceof Blob)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'validation_failed',
          message: 'Please provide a recent photograph of yourself.',
          fields: { photo: 'Please provide a recent photograph of yourself.' },
        },
      },
      { status: 400 }
    )
  }

  let voterCardBuffer: Buffer
  let photoBuffer: Buffer

  try {
    const rawVoterBuffer = Buffer.from(await voterCardFile.arrayBuffer())
    voterCardBuffer = await processImage(rawVoterBuffer, 1600)
  } catch (err) {
    if (err instanceof ImageError) {
      if (err.status === 400) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: 'validation_failed',
              message: 'Voter card file is too large.',
              fields: { voterCard: 'File must be under 2 MB.' },
            },
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'unsupported_media_type',
            message: 'Voter card must be a valid JPEG, PNG or WebP image.',
          },
        },
        { status: 415 }
      )
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'unsupported_media_type',
          message: 'Voter card image could not be processed.',
        },
      },
      { status: 415 }
    )
  }

  try {
    const rawPhotoBuffer = Buffer.from(await photoFile.arrayBuffer())
    photoBuffer = await processImage(rawPhotoBuffer, 1200)
  } catch (err) {
    if (err instanceof ImageError) {
      if (err.status === 400) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: 'validation_failed',
              message: 'Photograph file is too large.',
              fields: { photo: 'File must be under 2 MB.' },
            },
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'unsupported_media_type',
            message: 'Photograph must be a valid JPEG, PNG or WebP image.',
          },
        },
        { status: 415 }
      )
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'unsupported_media_type',
          message: 'Photograph could not be processed.',
        },
      },
      { status: 415 }
    )
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'service_unavailable',
          message: 'Database service is temporarily unavailable.',
        },
      },
      { status: 503 }
    )
  }

  // 8. Duplicate check in database
  const { data: existing, error: dupCheckError } = await supabase
    .from('registrations')
    .select('id')
    .or(`phone_e164.eq.${validData.phone},email.ilike.${validData.email}`)
    .maybeSingle()

  if (dupCheckError) {
    console.error('[db] Error checking duplicate registration:', dupCheckError)
  }

  const duplicateMessage = siteConfig.supportEmail
    ? `This phone number or email is already registered. If you have lost your code, contact ${siteConfig.supportEmail}.`
    : `This phone number or email is already registered. If you have lost your code, contact the ${siteConfig.orgShortName} admin.`

  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'duplicate',
          message: duplicateMessage,
        },
      },
      { status: 409 }
    )
  }

  // 9. Generate registration ID and unique code
  const registrationId = randomUUID()
  let code = generateCode(siteConfig.codePrefix)

  // 10. Upload both images to private bucket
  let voterCardPath: string
  let photoPath: string
  try {
    const uploadResult = await uploadRegistrationImages(registrationId, voterCardBuffer, photoBuffer)
    voterCardPath = uploadResult.voterCardPath
    photoPath = uploadResult.photoPath
  } catch (err) {
    console.error('[storage] Upload failed:', err)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'server_error',
          message: 'Failed to securely store registration documents.',
        },
      },
      { status: 500 }
    )
  }

  // 11. Insert row into database with retry on code collision
  let inserted = false
  let insertError: unknown = null

  const userAgent = (request.headers.get('user-agent') || '').slice(0, 300) || null
  const ipHashVal = hashIp(ip)

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await supabase.from('registrations').insert({
      id: registrationId,
      code,
      full_name: validData.fullName,
      phone_e164: validData.phone,
      email: validData.email,
      address: validData.address,
      state: validData.state,
      lga: validData.lga,
      voter_card_path: voterCardPath,
      photo_path: photoPath,
      status: 'pending',
      consent_at: new Date().toISOString(),
      consent_version: siteConfig.consentVersion,
      ip_hash: ipHashVal,
      user_agent: userAgent,
    })

    if (!error) {
      inserted = true
      break
    }

    insertError = error

    // PostgreSQL error 23505 is unique_violation
    if (error.code === '23505') {
      if (error.message?.includes('code')) {
        // Code collision: regenerate and retry
        code = generateCode(siteConfig.codePrefix)
        continue
      }
      // Unique violation on phone or email
      await deleteRegistrationImages(registrationId)
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'duplicate',
            message: duplicateMessage,
          },
        },
        { status: 409 }
      )
    }

    break
  }

  if (!inserted) {
    console.error('[db] Insert registration failed:', insertError)
    await deleteRegistrationImages(registrationId)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'server_error',
          message: 'Could not complete registration. Please try again.',
        },
      },
      { status: 500 }
    )
  }

  const now = new Date()

  // 12. Send Admin Notification Email
  let adminNotified = false
  try {
    adminNotified = await sendAdminNotification({
      id: registrationId,
      code,
      fullName: validData.fullName,
      phoneE164: validData.phone,
      email: validData.email,
      address: validData.address,
      state: validData.state,
      lga: validData.lga,
      createdAt: now,
    })

    if (adminNotified) {
      await supabase
        .from('registrations')
        .update({ admin_notified_at: now.toISOString() })
        .eq('id', registrationId)
    }
  } catch (err) {
    console.error('[email] Admin email notification error:', err)
  }

  // 13. Send Member Confirmation Email
  let memberEmailSent = false
  try {
    memberEmailSent = await sendMemberConfirmation({
      fullName: validData.fullName,
      email: validData.email,
      phoneE164: validData.phone,
      code,
    })

    if (memberEmailSent) {
      await supabase
        .from('registrations')
        .update({ member_notified_at: now.toISOString() })
        .eq('id', registrationId)
    }
  } catch (err) {
    console.error('[email] Member confirmation email error:', err)
  }

  // 14. Build response URLs
  const whatsappUrl = process.env.WHATSAPP_GROUP_INVITE_URL || null
  const adminWhatsappUrl = siteConfig.adminWhatsappNumber
    ? `https://wa.me/${siteConfig.adminWhatsappNumber}`
    : null

  return NextResponse.json({
    ok: true,
    code,
    whatsappUrl,
    adminWhatsappUrl,
    memberEmailSent,
  })
}
