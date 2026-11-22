import { randomInt } from 'node:crypto'

/** No 0, O, 1, I or L. */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function generateCode(prefix: string): string {
  let body = ''
  for (let i = 0; i < 6; i += 1) body += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return `${prefix}-${body}`
}

export function isWellFormedCode(code: string, prefix: string): boolean {
  return new RegExp(`^${prefix}-[2-9A-HJKMNP-Z]{6}$`).test(code)
}
