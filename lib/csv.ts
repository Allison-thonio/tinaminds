export function csvCell(value: unknown, freeText = true): string {
  let s = value === null || value === undefined ? '' : String(value)
  if (freeText && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function csvRow(cells: ReadonlyArray<{ v: unknown; freeText?: boolean }>): string {
  return cells.map((c) => csvCell(c.v, c.freeText ?? true)).join(',')
}

export const CSV_BOM = '\uFEFF'
