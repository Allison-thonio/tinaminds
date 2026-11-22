const requiredRegistration = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'RESEND_FROM', 'ADMIN_NOTIFY_EMAIL', 'SITE_URL'] as const
const requiredAdmin = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'SITE_URL'] as const

export function registrationEnvironment() {
  const missing = requiredRegistration.filter((key) => !process.env[key])
  return missing.length ? { missing } : { missing: [], ready: true as const }
}

export function adminEnvironment() {
  const missing = requiredAdmin.filter((key) => !process.env[key] || (key === 'ADMIN_SESSION_SECRET' && (process.env[key]?.length ?? 0) < 32))
  return missing.length ? { missing } : { missing: [], ready: true as const }
}

export function turnstileEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY)
}
