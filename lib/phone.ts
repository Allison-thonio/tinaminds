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
