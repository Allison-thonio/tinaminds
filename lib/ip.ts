import { createHash } from 'node:crypto'

export function requestIp(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || 'unknown'
}

export function hashIp(ip: string): string | null {
  const salt = process.env.IP_HASH_SALT
  return salt ? createHash('sha256').update(ip + salt).digest('hex') : null
}
