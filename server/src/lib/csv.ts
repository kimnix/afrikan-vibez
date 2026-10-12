/**
 * Serialise an array of flat records to an RFC 4180-compatible CSV string.
 * Values containing a comma, quote or newline are quoted and inner quotes are
 * doubled. A UTF-8 BOM is prepended so Excel opens non-ASCII text correctly.
 */
export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  const columns = headers ?? (rows[0] ? Object.keys(rows[0]) : [])
  if (columns.length === 0) return ''

  const escape = (value: unknown): string => {
    const text = value == null ? '' : String(value)
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }

  const lines = [columns.map(escape).join(',')]
  for (const row of rows) {
    lines.push(columns.map((column) => escape(row[column])).join(','))
  }
  return `\uFEFF${lines.join('\r\n')}`
}
