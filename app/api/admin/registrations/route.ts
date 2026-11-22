import { NextResponse } from 'next/server'
import { isAuthenticatedAdmin } from '@/lib/auth'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DbRow = {
  id: string
  code: string
  full_name: string
  phone_e164: string
  email: string
  address: string
  state: string
  lga: string
  status: string
  admin_notes: string | null
  verified_at: string | null
  admin_notified_at: string | null
  created_at: string
  total_count: number
}

export async function GET(request: Request) {
  if (!(await isAuthenticatedAdmin(request))) {
    return NextResponse.json({ ok: false, error: { code: 'unauthorized', message: 'Unauthorized' } }, { status: 401 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: { code: 'service_unavailable', message: 'Database service unavailable' } },
      { status: 503 }
    )
  }

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() || null
  const status = url.searchParams.get('status')?.trim() || null
  const state = url.searchParams.get('state')?.trim() || null
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.max(1, Math.min(100, parseInt(url.searchParams.get('pageSize') || '25', 10) || 25))
  const offset = (page - 1) * pageSize

  // Fetch paginated rows and total count
  const { data: rows, error: searchError } = await supabase.rpc('admin_search_registrations', {
    p_q: q,
    p_status: status === 'all' ? null : status,
    p_state: state === 'all' ? null : state,
    p_limit: pageSize,
    p_offset: offset,
  })

  if (searchError) {
    console.error('[admin] Search registrations error:', searchError)
    return NextResponse.json(
      { ok: false, error: { code: 'server_error', message: 'Failed to retrieve registrations' } },
      { status: 500 }
    )
  }

  // Fetch status counts
  const { data: countRows, error: countsError } = await supabase.rpc('admin_registration_counts')
  if (countsError) {
    console.warn('[admin] Registration counts error:', countsError)
  }

  const counts = {
    pending: 0,
    verified: 0,
    rejected: 0,
    total: 0,
  }

  if (Array.isArray(countRows)) {
    for (const item of countRows as { status: string; total: number }[]) {
      const num = Number(item.total) || 0
      if (item.status === 'pending') counts.pending = num
      else if (item.status === 'verified') counts.verified = num
      else if (item.status === 'rejected') counts.rejected = num
      counts.total += num
    }
  }

  const typedRows = (rows as DbRow[]) || []
  const total = typedRows.length > 0 ? Number(typedRows[0].total_count) : 0

  const items = typedRows.map((r) => ({
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
  }))

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    counts,
  })
}
