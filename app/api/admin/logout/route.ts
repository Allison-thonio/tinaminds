import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME, verifyAdminOrigin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!verifyAdminOrigin(request)) {
    return NextResponse.json({ ok: false, error: { code: 'forbidden', message: 'Invalid Origin' } }, { status: 403 })
  }

  const isProd = process.env.NODE_ENV === 'production'
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  response.cookies.set({
    name: 'admin_session',
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return response
}
