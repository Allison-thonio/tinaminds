import { NextResponse } from 'next/server'
import { adminEnvironment } from '@/lib/env'
import { requestIp } from '@/lib/ip'
import { checkRateLimit } from '@/lib/ratelimit'
import {
  verifyAdminPassword,
  createSessionToken,
  verifyAdminOrigin,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!verifyAdminOrigin(request)) {
    return NextResponse.json({ ok: false, error: { code: 'forbidden', message: 'Invalid Origin' } }, { status: 403 })
  }

  const { missing } = adminEnvironment()
  if (missing.length) {
    console.warn(`[config] Admin sign-in disabled. Missing: ${missing.join(', ')}`)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'service_unavailable',
          message: 'Admin sign-in is not configured.',
        },
      },
      { status: 503 }
    )
  }

  const ip = requestIp(request)

  // Rate limit: 5 attempts per 15 minutes per IP
  const rateLimit = checkRateLimit(`admin-login:${ip}`, 5, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'rate_limited',
          message: 'Too many sign-in attempts. Please try again later.',
        },
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfter) },
      }
    )
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'bad_request',
          message: 'Invalid request payload.',
        },
      },
      { status: 400 }
    )
  }

  const password = typeof body.password === 'string' ? body.password : ''
  if (!password || password.length > 256 || !verifyAdminPassword(password)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'unauthorized',
          message: 'Incorrect password.',
        },
      },
      { status: 401 }
    )
  }

  const token = await createSessionToken()
  const isProd = process.env.NODE_ENV === 'production'

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  })

  return response
}
