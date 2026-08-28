// SPDX-License-Identifier: Apache-2.0
/**
 * Rechenkern der Dashboard-Diagramme.
 *
 * Alles, was die SVG-Renderer an Zahlen und Listen brauchen, liegt hier als
 * reine Funktion vor: Aggregationen ueber Datensaetze, Skalierung der Achsen,
 * Aufteilung in Monats-Bins. Die Render-Komponenten in dashboard.jsx rufen
 * diese Funktionen auf und zeichnen damit Inline-SVG.
 *
 * Bewusst getrennt vom Renderer: so kann ein Test die Mathematik pruefen, ohne
 * einen Browser zu starten, und so bleibt klar, dass sanitizeSvg nichts an der
 * Skalierung aendert - SVG wird hier nur vorbereitet, im Renderer entsteht
 * der String und der Renderer selbst fuegt nichts Skriptfaehiges ein.
 *
 * Drei Diagrammtypen: Balken (eine Reihe, Gruppierung ueber ein Feld), Donut
 * (Anteile an einer Summe, Gruppierung wie Balken), Linie (Zeitreihe,
 * Aggregation count oder sum(field) je Monat). Eine Deklaration ohne die
 * erforderlichen Felder meldet validateChart als Beanstandung, nicht still.
 */

import { fieldValue, findField } from './entities.js'

/* ── Achsen-Skalierung ─────────────────────────────────────────── */

/**
 * Skaliert einen Maximalwert auf eine saubere Obergrenze mit runden Ticks.
 *
 * Der hoechste Tick liegt knapp UEBER dem Maximalwert - nicht darauf und nicht
 * darunter: darauf wuerde der groesste Balken oder die Spitze der Linie am
 * Rand kleben, darunter wuerde die Zeichnung die letzte Stufe des Rasters
 * nicht erreichen. Die Schrittweite folgt 1, 2, 5, 10 in der naechsten
 * Zehnerpotenz, das ist die uebliche Lesart fuer solche Skalen.
 */
export function niceScale(maxRaw) {
  const max = Math.max(0, Number(maxRaw) || 0)
  if (max === 0) return { ticks: [0], max: 0, step: 0 }
  const exp = Math.floor(Math.log10(max))
  const base = 10 ** exp
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * base)
  let step = candidates[candidates.length - 1]
  for (const c of candidates) {
    if (max <= c) {
      step = c
      break
    }
  }
  // Drei Ticks: 0, Mitte, Maximum. Mehr macht die Beschriftung auf der
  // Kachelbreite zu eng und hilft der Lesbarkeit nicht.
  return {
    ticks: [0, step / 2, step],
    max: step,
    step,
  }
}

/**
 * Pfad-String fuer eine Linie durch die gegebenen Punkte.
 *
 * Punkte werden in der Reihenfolge verbunden, in der sie ankommen - der
 * Aufrufer sortiert bereits nach Monat. null-Eintraege (fehlende Daten) werden
 * uebersprungen, damit die Linie nicht ueber eine leere Stelle hinweg zeichnet
 * und so einen Monat mit Wert erfindet, den es nicht gibt.
 */
export function linePath(points, x, y) {
  let d = ''
  let started = false
  for (const p of points) {
    if (p.value === null || p.value === undefined || Number.isNaN(p.value)) continue
    const cx = x(p.key)
    const cy = y(p.value)
    d += started ? ` L${cx.toFixed(2)} ${cy.toFixed(2)}` : `M${cx.toFixed(2)} ${cy.toFixed(2)}`
    started = true
  }
  return d
}

/* ── Datenvorbereitung: Balken und Donut ───────────────────────── */

/**
 * Gruppiert die Datensaetze nach `groupBy` und misst je Gruppe. Reihenfolge:
 * erst die im Schema deklarierten Enumwerte, dann alle uebrigen. Das haelt
 * die Reihenfolge der Legende stabil, auch wenn neue Werte auftauchen, und
 * der Aufrufer sieht ohne Sortierung eine sinnvolle Lesereihenfolge.
 *
 * Leere Datensaetze liefern ein leeres Array - der Renderer entscheidet dann,
 * ob er einen Hinweis oder einen Strichplatzhalter zeichnet.
 */
export function prepareBarRows(entity, records, groupBy, measure) {
  if (!groupBy) return { rows: [], max: 0 }
  const field = findField(entity.schema, groupBy)
  const keys = field?.values ?? [...new Set(records.map((r) => r[groupBy]).filter((v) => v !== '' && v != null))]
  const rows = keys.map((key) => ({
    key,
    label: key || '—',
    value: measureValue(entity, records.filter((r) => r[groupBy] === key), measure),
  }))
  const max = rows.reduce((m, r) => (r.value > m ? r.value : m), 0)
  return { rows, max }
}

/**
 * Wie prepareBarRows, aber zusaetzlich mit Anteilen an der Summe. Reihenfolge
 * der Segmente entspricht der Reihenfolge der Reihen - der Donut faengt oben
 * an und laeuft im Uhrzeigersinn, die Legende folgt.
 */
export function prepareDonutRows(entity, records, groupBy, measure) {
  const { rows } = prepareBarRows(entity, records, groupBy, measure)
  const total = rows.reduce((n, r) => n + r.value, 0)
  return { rows, total }
}

const sum = (entity, records, key) =>
  records.reduce((n, r) => n + (Number(fieldValue(entity, r, key)) || 0), 0)

function measureValue(entity, records, measure) {
  if (!measure || measure === 'count') return records.length
  return sum(entity, records, measure)
}

/* ── Datenvorbereitung: Linie ─────────────────────────────────── */

/**
 * Aggregiert die Datensaetze nach Monat im Format YYYY-MM.
 *
 * Das Datum wird als lokaler Kalendertag aus dem ISO-String gelesen - genau
 * wie in den uebrigen Datumspruefungen, damit ein Faelligkeitsdatum in
 * Zeitzone X nicht in den Vormonat rutscht, nur weil new Date() es in UTC
 * anders interpretiert. Leere oder ungueltige Werte fallen aus der Reihe,
 * werden aber nicht zu null - sie hinterlassen eine Luecke in der Monatsliste,
 * die der Renderer als fehlenden Datenpunkt zeichnet.
 *
 * `aggregate` ist 'count' (Anzahl je Monat) oder 'sum' (Summe eines
 * Zahlenfeldes, dann ist `field` der Schluessel).
 *
 * Monatsgrenzen bleiben fuer die ganze Reihe gleich: vom ersten bis zum
 * letzten vorkommenden Monat in den Daten, mit Luecken dazwischen. Eine
 * reine Datumsachse ohne Daten waere eine Linie ohne Punkte und nicht lesbar.
 */
export function prepareLinePoints(entity, records, dateField, aggregate, field) {
  if (!dateField || !aggregate) return { points: [], months: [], max: 0 }
  const bins = new Map()
  const monthLabel = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  for (const r of records) {
    const raw = r[dateField]
    const d = localDateFromIso(raw)
    if (!d) continue
    const key = monthLabel(d)
    if (aggregate === 'count') {
      bins.set(key, (bins.get(key) ?? 0) + 1)
    } else if (aggregate === 'sum' && field) {
      bins.set(key, (bins.get(key) ?? 0) + (Number(fieldValue(entity, r, field)) || 0))
    }
  }
  if (bins.size === 0) return { points: [], months: [], max: 0 }
  const sortedKeys = [...bins.keys()].sort()
  const points = sortedKeys.map((key) => ({ key, value: bins.get(key) }))
  return { points, months: sortedKeys, max: points.reduce((m, p) => (p.value > m ? p.value : m), 0) }
}

const localDateFromIso = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
  if (!match) return null
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

/* ── Validierung ──────────────────────────────────────────────── */

/**
 * Prueft eine Chart-Deklaration gegen das Schema. Liefert eine Liste von
 * Beanstandungen - genau wie validateMetrics, damit verworfene Eintraege im
 * Raster sichtbar werden statt still zu verschwinden.
 *
 * 'chart' ist die neue einheitliche Variante; 'bar' und 'donut' bleiben
 * zunaechst als Kacheltypen erhalten und werden hier als ihre eigene Art
 * angenommen, damit bestehende Beispiele ohne Aenderung funktionieren.
 */
export function validateChart(decl, entity) {
  const issues = []
  if (!decl || typeof decl !== 'object') {
    issues.push({ code: 'malformed' })
    return issues
  }
  const kind = decl.kind ?? (decl.type === 'bar' ? 'bar' : decl.type === 'donut' ? 'donut' : null)
  if (!kind || !['bar', 'donut', 'line'].includes(kind)) {
    issues.push({ code: 'kindUnknown', params: { kind: decl.kind ?? decl.type ?? '' } })
    return issues
  }
  if (kind === 'bar' || kind === 'donut') {
    if (!decl.groupBy) {
      issues.push({ code: 'groupByMissing' })
    } else if (!findField(entity.schema, decl.groupBy)) {
      issues.push({ code: 'groupByUnknown', params: { field: decl.groupBy } })
    }
    if (decl.measure && decl.measure !== 'count') {
      const f = findField(entity.schema, decl.measure)
      if (!f) issues.push({ code: 'measureUnknown', params: { field: decl.measure } })
      else if (f.type !== 'number' && f.type !== 'computed') {
        issues.push({ code: 'measureNotNumeric', params: { label: f.label } })
      }
    }
  }
  if (kind === 'line') {
    if (!decl.dateField) {
      issues.push({ code: 'dateFieldMissing' })
    } else if (!findField(entity.schema, decl.dateField)) {
      issues.push({ code: 'dateFieldUnknown', params: { field: decl.dateField } })
    } else if (findField(entity.schema, decl.dateField).type !== 'date' &&
        findField(entity.schema, decl.dateField).type !== 'computed') {
      issues.push({ code: 'dateFieldNotDate', params: { label: findField(entity.schema, decl.dateField).label } })
    }
    if (!['count', 'sum'].includes(decl.aggregate)) {
      issues.push({ code: 'aggregateUnknown', params: { aggregate: decl.aggregate ?? '' } })
    }
    if (decl.aggregate === 'sum') {
      if (!decl.field) {
        issues.push({ code: 'sumFieldMissing' })
      } else {
        const f = findField(entity.schema, decl.field)
        if (!f) issues.push({ code: 'sumFieldUnknown', params: { field: decl.field } })
        else if (f.type !== 'number' && f.type !== 'computed') {
          issues.push({ code: 'sumFieldNotNumeric', params: { label: f.label } })
        }
      }
    }
  }
  return issues
}
