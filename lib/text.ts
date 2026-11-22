/** Control characters (incl. newlines and tabs) become a space, then trim and collapse. */
export function cleanText(input: string): string {
  return input.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ')
}

/** 2 to 80 characters. Letters (any language), marks, space, dot, apostrophe, hyphen. */
export const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'\-]{1,79}$/u

export function isValidName(cleaned: string): boolean {
  return NAME_RE.test(cleaned)
}
