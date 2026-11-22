import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  response.cookies.delete('admin_session')
  return response
}
