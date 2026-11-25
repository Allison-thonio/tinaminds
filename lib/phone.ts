/** Nigerian mobile numbers only: +234 then [7|8|9][0|1] then 8 digits. */
const E164_NG = /^\+234[789][01]\d{8}$/

/** Accepts 0803..., 803..., 234803..., +234803... with spaces, dashes, dots or brackets. */
export function normalizeNigerianPhone(raw: string): string | null {
  let s = raw.replace(/[\s\-().]/g, '')
  if (s.startsWith('+234')) {
    // already international
  } else if (s.startsWith('234')) {
    s = `+${s}`
  } else if (/^0\d{10}$/.test(s)) {
    s = `+234${s.slice(1)}`
  } else if (/^\d{10}$/.test(s)) {
    s = `+234${s}`
  }
  return E164_NG.test(s) ? s : null
}

/** For CSV export: a text value that is not parsed as a number by Excel. */
export function formatPhoneForExport(e164: string): string {
  return e164.replace(/^(\+234)(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3 $4')
}

/**
 * Extracts normalized trailing digits from a phone search query
 * (e.g. "0803 123 4567" -> "8031234567", "+234803" -> "803")
 * so partial or local-format searches match stored +234 E.164 numbers.
 */
export function extractPhoneSearchDigits(raw: string): string | null {
  const trimmed = raw.trim()
  if (!/^[0-9 +().-]{3,}$/.test(trimmed)) return null
  const digits = trimmed.replace(/\D/g, '').replace(/^(00?234|234|0)/, '')
  return digits.length >= 2 ? digits : null
}

/** Builds a safe PostgREST `.or(...)` filter string for fallback admin search. */
export function buildFallbackSearchFilter(rawQuery: string): string {
  const safe = rawQuery.replace(/[,()]/g, ' ').trim()
  const phoneDigits = extractPhoneSearchDigits(rawQuery)
  const phonePattern = phoneDigits ?? safe
  return `full_name.ilike.%${safe}%,email.ilike.%${safe}%,code.ilike.%${safe}%,phone_e164.ilike.%${phonePattern}%`
}
