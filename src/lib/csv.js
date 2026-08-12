// SPDX-License-Identifier: Apache-2.0
const quote = (v) => {
  const s = v == null ? '' : String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Semikolon-getrennt und mit BOM - so öffnet Excel auf deutschen Systemen sauber. */
export function toCsv(rows, columns) {
  const head = columns.map((c) => quote(c.label)).join(';')
  const body = rows.map((r) => columns.map((c) => quote(r[c.key])).join(';'))
  return '\uFEFF' + [head, ...body].join('\r\n')
}
