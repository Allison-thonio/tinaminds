import { NextResponse } from 'next/server'
import { isAuthenticatedAdmin, verifyAdminOrigin } from '@/lib/auth'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { sendAdminNotification } from '@/lib/email/admin-notification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
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

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: { code: 'service_unavailable', message: 'Database service unavailable' } },
      { status: 503 }
    )
  }

  const { data: r, error } = await supabase
    .from('registrations')
    .select('id, code, full_name, phone_e164, email, address, state, lga, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !r) {
    return NextResponse.json({ ok: false, error: { code: 'not_found', message: 'Registration not found' } }, { status: 404 })
  }

  const sent = await sendAdminNotification({
    id: r.id,
    code: r.code,
    fullName: r.full_name,
    phoneE164: r.phone_e164,
    email: r.email,
    address: r.address,
    state: r.state,
    lga: r.lga,
    createdAt: new Date(r.created_at),
  })

  if (!sent) {
    return NextResponse.json(
      { ok: false, error: { code: 'server_error', message: 'Failed to send admin notification email' } },
      { status: 500 }
    )
  }

  const now = new Date().toISOString()
  await supabase.from('registrations').update({ admin_notified_at: now }).eq('id', id)

  return NextResponse.json({ ok: true, adminNotifiedAt: now })
}
