// SPDX-License-Identifier: Apache-2.0
/**
 * Kennzahl-Kacheln aus einem geschlossenen Katalog. Eine Entität meldet sie
 * über `schema.metrics`, jede Deklaration ist eine von genau drei Formen:
 *
 *   { op: 'count', label, caption?, filter? }   Anzahl der Datensätze
 *   { op: 'sum',   field,  label, caption? }    Summe über ein Zahlenfeld
 *   { op: 'avg',   field,  label, caption? }    Mittelwert, zwei Nachkommastellen
 *
 * `filter(record)` schränkt die Menge vorher ein - dieselbe Semantik wie bei
 * den stat-Tiles des DASHBOARD-Exports. Es gibt bewusst keinen vierten Weg:
 * eine Zeichenkette, die ausgewertet wird (eval/new Function), existiert hier
 * nicht - deklariert wird nur aus dem Katalog, gerechnet wird nur im Framework.
 *
 * Ungültige Deklarationen werden beim Laden zurückgewiesen und benannt, nicht
 * still übergangen - eine Kennzahl, die sich still abschaltet, fällt erst auf,
 * wenn jemand die Zahl vermisst.
 */
import { fieldValue, findField } from './entities.js'

/** Der geschlossene Katalog. Neue Formen kommen hier hinzu oder gar nicht. */
export const METRIC_OPS = ['count', 'sum', 'avg']

/** Ob irgendeine Entität Kennzahlen deklariert hat - Freischalter für die Ansicht. */
export const hasMetrics = (entities) =>
  Object.values(entities).some((e) => (e.schema.metrics ?? []).length > 0)

/**
 * Prüft die Deklarationen eines Schemas. Liefert `{ metrics, issues }`:
 * die gültigen, bereits normalisierten Kennzahlen und die Verwerfungen mit
 * Fehlercode - bewusst Codes statt fertiger Sätze, damit der Aufrufer sie in
 * der eingestellten Oberflächensprache formuliert (wie coerceField).
 */
export function validateMetrics(schema) {
  const metrics = []
  const issues = []
  for (const [index, raw] of (schema.metrics ?? []).entries()) {
    const decl = typeof raw === 'string' ? { op: raw } : raw
    const op = decl?.op
    if (!METRIC_OPS.includes(op)) {
      issues.push({ index, code: 'unknownOp', params: [String(op)] })
      continue
    }
    if (op !== 'count') {
      const field = findField(schema, decl.field)
      if (!decl.field || !field) {
        issues.push({ index, code: 'fieldMissing', params: [decl.field ?? ''] })
        continue
      }
      if (field.type !== 'number') {
        issues.push({ index, code: 'notNumeric', params: [field.label] })
        continue
      }
    }
    metrics.push({
      op,
      field: op === 'count' ? null : decl.field,
      filter: decl.filter,
      caption: decl.caption,
      // Ohne Label aus dem Schema: count trägt den Plural, sum/avg das Feld.
      label: decl.label ?? defaultLabel(schema, op, decl.field),
    })
  }
  return { metrics, issues }
}

function defaultLabel(schema, op, key) {
  if (op === 'count') return schema.plural
  return `${op === 'sum' ? 'Σ' : 'Ø'} ${findField(schema, key)?.label ?? key}`
}

/**
 * Wert einer Kennzahl über den Bestand. Rein lokale Berechnung beim Rendern -
 * nichts davon wird in den Datensatz oder den Datenblock geschrieben, dieselbe
 * Haltung wie bei berechneten Feldern.
 */
export function metricValue(entity, records, metric) {
  const rows = metric.filter ? records.filter(metric.filter) : records
  if (metric.op === 'count') return rows.length
  let total = 0
  for (const r of rows) total += Number(fieldValue(entity, r, metric.field)) || 0
  if (metric.op === 'sum') return total
  // Der Mittelwert einer leeren Menge ist keiner - NaN signalisiert das der
  // Formatierung, die daraus einen Strich macht.
  return rows.length ? total / rows.length : NaN
}

/**
 * Formatierung nach Feldtyp: Ganzzahlen bleiben Ganzahlen, Brüche folgen dem
 * Dezimalzeichen der Oberflächensprache; avg steht auf zwei Nachkommastellen
 * fest, sonst würde 7 je nach Bestand mal als 7 und mal als 7,333 erscheinen.
 */
export function formatMetricValue(value, locale, decimals) {
  if (!Number.isFinite(value)) return '—'
  const options =
    decimals === undefined ? undefined : { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
  try {
    return new Intl.NumberFormat(locale, options).format(value)
  } catch {
    return decimals === undefined ? String(value) : value.toFixed(decimals)
  }
}
