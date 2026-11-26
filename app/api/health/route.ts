import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ ok: false, db: 'unconfigured' }, { status: 503 })
  }

  const { error } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .limit(1)

  if (error) {
    return NextResponse.json({ ok: false, db: 'error' }, { status: 503 })
  }

  return NextResponse.json({ ok: true, db: 'ok' })
}
