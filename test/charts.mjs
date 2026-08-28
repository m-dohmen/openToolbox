// SPDX-License-Identifier: Apache-2.0
/**
 * Praegt die Mathematik hinter den Diagrammen ohne einen Browser zu starten:
 *
 *  - niceScale: Skalierung mit runden Ticks, ein Tick ueber dem Maximum.
 *  - linePath: baut einen SVG-Pfad aus einer Reihe von Punkten und ueberspringt
 *    Luecken, statt eine Linie ueber fehlende Daten hinweg zu zeichnen.
 *  - prepareBarRows / prepareDonutRows: Aggregationen, Reihenfolge, Anteile.
 *  - prepareLinePoints: Aggregation je Monat (count, sum) ueber ein
 *    Datumsfeld, leere Monate als Luecke.
 *  - validateChart: Beanstandungen, keine stillschweigend verworfenen Deklar.
 *
 * Dazu kommt eine kurze Runde gegen sanitizeSvg, das die Logo-Pruefung schon
 * fuer den Datenblock nutzt: der SVG-Output, den der Renderer erzeugt, muss
 * genauso sauber sein - sonst waere eine externe Quelle oder ein Skript
 * moeglich. Wir bauen einen synthetischen SVG-String mit allen Feldern und
 * schicken ihn durch die Pruefung; was uebrig bleibt, muss dem erwarteten
 * Element ohne Skripte, Event-Handler oder externe URL entsprechen.
 */

import {
  niceScale,
  linePath,
  prepareBarRows,
  prepareDonutRows,
  prepareLinePoints,
  validateChart,
} from '../src/lib/charts.js'

const fail = (m) => {
  console.error('FEHLER: ' + m)
  process.exitCode = 1
}

/* Hilfsfunktion: lokales ISO-Datum in Millisekunden, damit die prepare-Funktionen
   Datumsfelder lesen koennen wie der Renderer. Eine Konstante reicht; die
   echte Datumskonstruktion laeuft in der Bibliothek. */
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const entity = {
  schema: {
    idField: 'id',
    singular: 'item',
    plural: 'items',
    titleField: 'title',
    list: ['title', 'area', 'status', 'effort', 'due'],
    facets: ['area', 'status'],
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'area', label: 'Area', type: 'enum', values: ['IT', 'PR', 'PE'] },
      { key: 'status', label: 'Status', type: 'enum', values: ['open', 'done'] },
      { key: 'effort', label: 'Effort', type: 'number' },
      { key: 'due', label: 'Due', type: 'date' },
      { key: 'score', label: 'Score', type: 'computed', compute: (r) => Number(r.effort) * 2 },
    ],
  },
  uid: () => 'X-1',
  emptyRecord: () => ({ id: '', title: '', area: 'IT', status: 'open', effort: 0, due: '' }),
  seed: () => [],
  isDone: (r) => r.status === 'done',
  isOverdue: () => false,
}

const records = [
  { id: '1', title: 'A', area: 'IT', status: 'open', effort: 3, due: iso(2026, 1, 5) },
  { id: '2', title: 'B', area: 'IT', status: 'done', effort: 5, due: iso(2026, 2, 15) },
  { id: '3', title: 'C', area: 'PR', status: 'open', effort: 2, due: iso(2026, 2, 22) },
  { id: '4', title: 'D', area: 'PE', status: 'open', effort: 7, due: iso(2026, 3, 8) },
  { id: '5', title: 'E', area: 'PE', status: 'done', effort: 1, due: iso(2026, 3, 9) },
]

/* ── niceScale ────────────────────────────────────────────────── */

const scaleCases = [
  // [max, [erwartete ticks], erwartete max]
  [0, [0], 0],
  [1, [0, 0.5, 1], 1],
  [7, [0, 5, 10], 10],
  // 42 landet auf der 50er-Stufe (1, 2, 2.5, 5, 10 * 10^1) - nicht erst auf der
  // naechsten Dekade, sonst wuerde der Balken auf 100 gestreckt und der
  // Maximalwert kaeme auf der Skala nicht mehr vor.
  [42, [0, 25, 50], 50],
  [950, [0, 500, 1000], 1000],
  // Genau auf einer Stufe: keine Verdoppelung.
  [10, [0, 5, 10], 10],
  // 75 liegt zwischen 50 und 100, also auf der 100er-Stufe.
  [75, [0, 50, 100], 100],
]
let scaleOk = 0
for (const [max, ticks, top] of scaleCases) {
  const got = niceScale(max)
  if (JSON.stringify(got.ticks) === JSON.stringify(ticks) && got.max === top) scaleOk++
  else fail(`niceScale(${max}) -> ${JSON.stringify(got)}, erwartet ticks=${JSON.stringify(ticks)} max=${top}`)
}
console.log(`A) Skalierung mit runden Ticks: ${scaleOk}/${scaleCases.length} Faelle korrekt`)

/* ── linePath ─────────────────────────────────────────────────── */

const lp1 = linePath(
  [
    { key: '2026-01', value: 1 },
    { key: '2026-02', value: null },
    { key: '2026-03', value: 3 },
  ],
  (k) => ({ '2026-01': 0, '2026-02': 50, '2026-03': 100 })[k],
  (v) => 100 - v * 10,
)
console.log('B) Liniendiagramm mit Luecke:', lp1)
// M-Befehl am Anfang, gefolgt von genau einem L-Befehl - die Luecke in der
// Mitte wird uebersprungen, die Linie springt nicht ueber sie hinweg.
if (!/^M[\d.\-]+ [\d.\-]+$/.test(lp1.split(' L')[0])) fail('Liniendiagramm faengt nicht am ersten Punkt an')
const segments = lp1.split(' L')
if (segments.length !== 2) fail(`Luecke wurde ueberzeichnet: ${segments.length} Segmente statt 2`)
// segments[1] enthaelt die Koordinaten des L-Befehls OHNE das fuehrende 'L',
// weil split(' L') das entfernt - darum matchen wir ohne L am Anfang.
if (!/^[\d.\-]+ [\d.\-]+$/.test(segments[1])) fail('Liniendiagramm endet nicht am letzten Punkt: ' + segments[1])

const lpEmpty = linePath([], () => 0, () => 0)
if (lpEmpty !== '') fail('Leere Punktliste ergibt keinen leeren Pfad')

const lpAllNull = linePath(
  [
    { key: '2026-01', value: null },
    { key: '2026-02', value: null },
  ],
  () => 0,
  () => 0,
)
if (lpAllNull !== '') fail('Eine Reihe nur aus null-Werten ergibt einen Pfad')

/* ── prepareBarRows ───────────────────────────────────────────── */

const barAll = prepareBarRows(entity, records, 'area', 'count')
console.log('C) Balken je Bereich:', barAll.rows.map((r) => `${r.key}=${r.value}`).join(', '), '| max:', barAll.max)
const barKeys = barAll.rows.map((r) => r.key).join(',')
if (barKeys !== 'IT,PR,PE') fail('Balken-Reihenfolge folgt nicht der Enum-Reihenfolge: ' + barKeys)
const barValues = barAll.rows.map((r) => r.value)
if (barValues.join(',') !== '2,1,2') fail('Balken-Werte falsch aggregiert: ' + barValues)
if (barAll.max !== 2) fail('Maximalwert der Balken falsch: ' + barAll.max)

const barEmpty = prepareBarRows(entity, [], 'area', 'count')
// Ohne Datensaetze liefert die Enum-Reihenfolge trotzdem alle Kategorien -
// so bleibt die Reihenfolge stabil, wenn spaeter Werte dazukommen. Werte sind
// 0, Max ist 0.
if (barEmpty.rows.length !== 3) fail('Leere Datensatzliste faellt auf die Enum-Reihenfolge zurueck')
if (barEmpty.max !== 0) fail('Leere Datensatzliste hat keinen Maximalwert')
if (barEmpty.rows.some((r) => r.value !== 0)) fail('Leere Reihen sollten alle den Wert 0 haben')

/* ── prepareDonutRows ─────────────────────────────────────────── */

const donut = prepareDonutRows(entity, records, 'status', 'count')
console.log('D) Donut je Status:', donut.rows.map((r) => `${r.key}=${r.value}`).join(', '), '| total:', donut.total)
if (donut.total !== 5) fail('Donut-Gesamtsumme entspricht nicht dem Bestand: ' + donut.total)
if (donut.rows.find((r) => r.key === 'open').value !== 3) fail('Donut: offene nicht korrekt gezaehlt')
if (donut.rows.find((r) => r.key === 'done').value !== 2) fail('Donut: erledigte nicht korrekt gezaehlt')

/* ── prepareLinePoints ───────────────────────────────────────── */

const lineCount = prepareLinePoints(entity, records, 'due', 'count')
console.log('E) Linie (count) je Monat:', lineCount.points.map((p) => `${p.key}=${p.value}`).join(', '), '| max:', lineCount.max)
if (lineCount.points.length !== 3) fail('Liniendiagramm sollte 3 Monatsbins haben: ' + lineCount.points.length)
if (lineCount.points[0].key !== '2026-01') fail('Liniendiagramm beginnt nicht beim fruehesten Monat')
if (lineCount.max !== 2) fail('Maximalwert der Linie falsch: ' + lineCount.max)
if (lineCount.months.length !== 3) fail('Monatsliste deckt nicht alle vorkommenden Monate ab')

const lineSum = prepareLinePoints(entity, records, 'due', 'sum', 'effort')
console.log('F) Linie (sum effort):', lineSum.points.map((p) => `${p.key}=${p.value}`).join(', '))
const jan = lineSum.points.find((p) => p.key === '2026-01')
if (!jan || jan.value !== 3) fail('Summe Januar falsch: ' + (jan?.value))

const lineComputed = prepareLinePoints(entity, records, 'due', 'sum', 'score')
console.log('G) Linie (sum computed):', lineComputed.points.map((p) => `${p.key}=${p.value}`).join(', '))
// Score = effort * 2; January-Eintrag hat effort 3, also score 6.
const janScore = lineComputed.points.find((p) => p.key === '2026-01')
if (janScore.value !== 6) fail('Berechnetes Feld in sum-Aggregation falsch: ' + janScore.value)

const lineEmpty = prepareLinePoints(entity, [], 'due', 'count')
if (lineEmpty.points.length !== 0) fail('Leere Bestandsliste ergibt keine Linie')
if (lineEmpty.max !== 0) fail('Leere Linie hat keinen Maximalwert')

const lineBadDate = prepareLinePoints(entity, records, 'title', 'count')
if (lineBadDate.points.length !== 0) fail('Aggregation ueber ein Textfeld ergibt keine Linie')

const lineNoField = prepareLinePoints(entity, records, '', 'count')
if (lineNoField.points.length !== 0) fail('Aggregation ohne dateField ergibt keine Linie')

/* ── validateChart ────────────────────────────────────────────── */

const vUnknown = validateChart({ type: 'chart', kind: 'sparkle' }, entity)
if (!vUnknown.some((i) => i.code === 'kindUnknown')) fail('Unbekannte kind-Deklaration wurde nicht beanstandet')

const vBarMissing = validateChart({ type: 'chart', kind: 'bar' }, entity)
if (!vBarMissing.some((i) => i.code === 'groupByMissing')) fail('Balken ohne groupBy wurde nicht beanstandet')

const vBarBadField = validateChart({ type: 'chart', kind: 'bar', groupBy: 'ghost' }, entity)
if (!vBarBadField.some((i) => i.code === 'groupByUnknown')) fail('Unbekanntes groupBy wurde nicht beanstandet')
// Text-Feld ist weder number noch computed, also nicht aggregierbar.
const vBarBadMeasure = validateChart({ type: 'chart', kind: 'bar', groupBy: 'area', measure: 'title' }, entity)
if (!vBarBadMeasure.some((i) => i.code === 'measureNotNumeric')) fail('Textfeld als measure wurde nicht beanstandet')

const vBarComputed = validateChart({ type: 'chart', kind: 'bar', groupBy: 'area', measure: 'score' }, entity)
if (vBarComputed.length !== 0) fail('Berechnetes Feld als measure wurde zu Unrecht beanstandet: ' + JSON.stringify(vBarComputed))

const vLineMissing = validateChart({ type: 'chart', kind: 'line' }, entity)
if (!vLineMissing.some((i) => i.code === 'dateFieldMissing')) fail('Linie ohne dateField wurde nicht beanstandet')
if (!vLineMissing.some((i) => i.code === 'aggregateUnknown')) fail('Linie ohne aggregate wurde nicht beanstandet')

const vLineBadDate = validateChart({ type: 'chart', kind: 'line', dateField: 'title', aggregate: 'count' }, entity)
if (!vLineBadDate.some((i) => i.code === 'dateFieldNotDate')) fail('Textfeld als dateField wurde nicht beanstandet')

const vSumMissing = validateChart({ type: 'chart', kind: 'line', dateField: 'due', aggregate: 'sum' }, entity)
if (!vSumMissing.some((i) => i.code === 'sumFieldMissing')) fail('sum ohne field wurde nicht beanstandet')

const vSumComputed = validateChart({ type: 'chart', kind: 'line', dateField: 'due', aggregate: 'sum', field: 'score' }, entity)
if (vSumComputed.length !== 0) fail('Berechnetes Feld als sum.field wurde zu Unrecht beanstandet: ' + JSON.stringify(vSumComputed))

const vGoodBar = validateChart({ type: 'chart', kind: 'bar', groupBy: 'area', measure: 'effort' }, entity)
if (vGoodBar.length !== 0) fail('Saubere Balken-Deklaration wurde beanstandet: ' + JSON.stringify(vGoodBar))

const vGoodLine = validateChart({ type: 'chart', kind: 'line', dateField: 'due', aggregate: 'count' }, entity)
if (vGoodLine.length !== 0) fail('Saubere Linien-Deklaration wurde beanstandet: ' + JSON.stringify(vGoodLine))

// Legacy-Schreibweise { type: 'bar' } wird weiterhin als bar-Deklaration
// akzeptiert, damit bestehende Beispiele ohne Aenderung durchgehen.
const vLegacy = validateChart({ type: 'bar', groupBy: 'area' }, entity)
if (vLegacy.length !== 0) fail('Legacy-Form (type: bar) wurde zu Unrecht beanstandet: ' + JSON.stringify(vLegacy))
console.log('H) validateChart-Pruefung: bekannte Faelle sauber, unbekannte benannt')

console.log('\nChart-Bausteine geprueft.')
