import { NextResponse } from 'next/server'
import { isAuthenticatedAdmin } from '@/lib/auth'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { csvCell, csvRow, CSV_BOM } from '@/lib/csv'
import { formatPhoneForExport } from '@/lib/phone'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function formatDateLagos(isoDate: string | null): string {
  if (!isoDate) return ''
  try {
    const d = new Date(isoDate)
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return isoDate
  }
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

  // Fetch all matching rows up to 5000
  const { data: rows, error } = await supabase.rpc('admin_search_registrations', {
    p_q: q,
    p_status: status === 'all' ? null : status,
    p_state: state === 'all' ? null : state,
    p_limit: 5000,
    p_offset: 0,
  })

  if (error) {
    console.error('[admin] Export error:', error)
    return NextResponse.json({ ok: false, error: { code: 'server_error', message: 'Export failed' } }, { status: 500 })
  }

  const headers = [
    { v: 'Code' },
    { v: 'Full Name' },
    { v: 'Phone' },
    { v: 'Email' },
    { v: 'Address' },
    { v: 'State' },
    { v: 'LGA' },
    { v: 'Status' },
    { v: 'Registered At (WAT)' },
    { v: 'Verified At (WAT)' },
    { v: 'Admin Notes' },
  ]

  const lines = [csvRow(headers)]

  if (Array.isArray(rows)) {
    for (const r of rows) {
      const line = csvRow([
        { v: r.code, freeText: false },
        { v: r.full_name, freeText: true },
        { v: formatPhoneForExport(r.phone_e164), freeText: false },
        { v: r.email, freeText: true },
        { v: r.address, freeText: true },
        { v: r.state, freeText: true },
        { v: r.lga, freeText: true },
        { v: r.status, freeText: false },
        { v: formatDateLagos(r.created_at), freeText: false },
        { v: formatDateLagos(r.verified_at), freeText: false },
        { v: r.admin_notes || '', freeText: true },
      ])
      lines.push(line)
    }
  }

  const csvContent = CSV_BOM + lines.join('\r\n')
  const dateStr = new Date().toISOString().split('T')[0]

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="registrations-${dateStr}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
