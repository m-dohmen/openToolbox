// SPDX-License-Identifier: Apache-2.0
const quote = (v) => {
  const s = v == null ? '' : String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Semikolon-getrennt und mit BOM - so öffnet Excel auf deutschen Systemen sauber. */
export function toCsv(rows, columns) {
  const head = columns.map((c) => quote(c.label)).join(';')
  const body = rows.map((r) => columns.map((c) => quote(r[c.key])).join(';'))
  return '﻿' + [head, ...body].join('\r\n')
}

/* ── Einlesen ─────────────────────────────────────────────────── */

const DELIMITERS = [';', ',', '\t']

/**
 * Trennzeichen aus der Kopfzeile raten. Gezählt wird nur außerhalb von
 * Anführungszeichen, sonst gewinnt bei `"Meier, Anna";"IT"` das Komma.
 */
function sniffDelimiter(text) {
  const line = text.slice(0, text.search(/\r?\n/) === -1 ? text.length : text.search(/\r?\n/))
  let best = ';'
  let bestCount = 0
  for (const d of DELIMITERS) {
    let count = 0
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') quoted = !quoted
      else if (c === d && !quoted) count++
    }
    if (count > bestCount) {
      best = d
      bestCount = count
    }
  }
  return best
}

/**
 * CSV nach RFC 4180 lesen: Anführungszeichen schützen Trennzeichen und
 * Zeilenumbrüche, ein doppeltes "" innerhalb eines geschützten Feldes ist ein
 * echtes Anführungszeichen. BOM wird verworfen, CRLF/LF/CR gelten alle als
 * Zeilenende.
 *
 * Liefert { delimiter, columns, rows } - rows sind Arrays in Spaltenreihenfolge,
 * die Zuordnung zu Feldern passiert bewusst erst darüber im Zuordnungsdialog.
 */
export function fromCsv(text) {
  const clean = String(text ?? '').replace(/^﻿/, '')
  if (!clean.trim()) return { delimiter: ';', columns: [], rows: [] }

  const delimiter = sniffDelimiter(clean)
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  const endValue = () => {
    row.push(value)
    value = ''
  }
  const endRow = () => {
    endValue()
    // Zeilen, die nur aus einem leeren Feld bestehen, sind Leerzeilen.
    if (row.length > 1 || row[0] !== '') rows.push(row)
    row = []
  }

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]

    if (quoted) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          value += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        value += c
      }
      continue
    }

    if (c === '"') quoted = true
    else if (c === delimiter) endValue()
    else if (c === '\r') {
      if (clean[i + 1] === '\n') i++
      endRow()
    } else if (c === '\n') endRow()
    else value += c
  }
  if (value !== '' || row.length) endRow()

  const [header = [], ...body] = rows
  return {
    delimiter,
    columns: header.map((h) => h.trim()),
    rows: body,
  }
}
