import { NextResponse } from 'next/server'
import { isAuthenticatedAdmin, verifyAdminOrigin } from '@/lib/auth'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { deleteRegistrationImages } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  if (!(await isAuthenticatedAdmin(request))) {
    return NextResponse.json({ ok: false, error: { code: 'unauthorized', message: 'Unauthorized' } }, { status: 401 })
  }

  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: { code: 'bad_request', message: 'Invalid ID format' } }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: { code: 'service_unavailable', message: 'Database service unavailable' } },
      { status: 503 }
    )
  }

  const { data: r, error } = await supabase
    .from('registrations')
    .select('id, code, full_name, phone_e164, email, address, state, lga, status, admin_notes, created_at, verified_at, admin_notified_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !r) {
    return NextResponse.json({ ok: false, error: { code: 'not_found', message: 'Registration not found' } }, { status: 404 })
  }

  return NextResponse.json({
    id: r.id,
    code: r.code,
    fullName: r.full_name,
    phone: r.phone_e164,
    email: r.email,
    address: r.address,
    state: r.state,
    lga: r.lga,
    status: r.status,
    adminNotes: r.admin_notes,
    verifiedAt: r.verified_at,
    adminNotifiedAt: r.admin_notified_at,
    createdAt: r.created_at,
  })
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAuthenticatedAdmin(request))) {
    return NextResponse.json({ ok: false, error: { code: 'unauthorized', message: 'Unauthorized' } }, { status: 401 })
  }

  if (!verifyAdminOrigin(request)) {
    return NextResponse.json({ ok: false, error: { code: 'forbidden', message: 'Invalid Origin' } }, { status: 403 })
  }

  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: { code: 'bad_request', message: 'Invalid ID format' } }, { status: 400 })
  }

  let body: { status?: string; adminNotes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'bad_request', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.status) {
    if (!['pending', 'verified', 'rejected'].includes(body.status)) {
      return NextResponse.json(
        { ok: false, error: { code: 'bad_request', message: 'Invalid status value' } },
        { status: 400 }
      )
    }
    updates.status = body.status
    if (body.status === 'verified') {
      updates.verified_at = new Date().toISOString()
    } else {
      updates.verified_at = null
    }
  }

  if (body.adminNotes !== undefined) {
    if (body.adminNotes && body.adminNotes.length > 500) {
      return NextResponse.json(
        { ok: false, error: { code: 'bad_request', message: 'Admin notes must not exceed 500 characters' } },
        { status: 400 }
      )
    }
    updates.admin_notes = body.adminNotes ? body.adminNotes.trim() : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: { code: 'bad_request', message: 'No fields to update' } }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: { code: 'service_unavailable', message: 'Database service unavailable' } },
      { status: 503 }
    )
  }

  const { error } = await supabase.from('registrations').update(updates).eq('id', id)
  if (error) {
    console.error('[admin] Update registration error:', error)
    return NextResponse.json(
      { ok: false, error: { code: 'server_error', message: 'Failed to update record' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await isAuthenticatedAdmin(request))) {
    return NextResponse.json({ ok: false, error: { code: 'unauthorized', message: 'Unauthorized' } }, { status: 401 })
  }

  if (!verifyAdminOrigin(request)) {
    return NextResponse.json({ ok: false, error: { code: 'forbidden', message: 'Invalid Origin' } }, { status: 403 })
  }

  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: { code: 'bad_request', message: 'Invalid ID format' } }, { status: 400 })
  }

  const url = new URL(request.url)
  if (url.searchParams.get('confirm') !== 'true') {
    return NextResponse.json(
      { ok: false, error: { code: 'bad_request', message: 'Confirmation required (?confirm=true)' } },
      { status: 400 }
    )
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: { code: 'service_unavailable', message: 'Database service unavailable' } },
      { status: 503 }
    )
  }

  // Delete storage objects
  await deleteRegistrationImages(id)

  // Delete DB row
  const { error } = await supabase.from('registrations').delete().eq('id', id)
  if (error) {
    console.error('[admin] Delete registration error:', error)
    return NextResponse.json(
      { ok: false, error: { code: 'server_error', message: 'Failed to delete record' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
