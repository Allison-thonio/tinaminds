import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { safeEqual } from '@/lib/safe-equal'

export const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-admin_session' : 'admin_session'
export const SESSION_DURATION_SECONDS = 8 * 60 * 60 // 8 hours

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET is not configured or is shorter than 32 characters.')
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(): Promise<string> {
  const secretKey = getSecretKey()
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secretKey)
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secretKey = getSecretKey()
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] })
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export function verifyAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return safeEqual(candidate, expected)
}

export function parseSessionCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';').map((c) => c.trim())
  for (const cookie of cookies) {
    if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return cookie.slice(SESSION_COOKIE_NAME.length + 1)
    }
    // Also check fallback if in dev or transition
    if (cookie.startsWith('admin_session=')) {
      return cookie.slice('admin_session='.length)
    }
  }
  return null
}

export async function isAuthenticatedAdmin(request: Request): Promise<boolean> {
  const cookieHeader = request.headers.get('cookie')
  const token = parseSessionCookie(cookieHeader)
  if (!token) return false
  return await verifySessionToken(token)
}

export function verifyAdminOrigin(request: Request): boolean {
  const siteUrl = process.env.SITE_URL
  if (!siteUrl) return true // In dev if SITE_URL is not set
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    const originHost = new URL(origin).host
    const siteHost = new URL(siteUrl).host
    return originHost === siteHost
  } catch {
    return false
  }
}
