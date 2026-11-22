import { turnstileEnabled } from '@/lib/env'

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!turnstileEnabled()) return true
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret || !token) return false
  const body = new URLSearchParams({ secret, response: token, remoteip: ip })
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body, signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return false
    const result = await response.json() as { success?: boolean }
    return result.success === true
  } catch { return false }
}
