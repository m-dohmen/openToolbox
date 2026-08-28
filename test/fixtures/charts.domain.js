// SPDX-License-Identifier: Apache-2.0
// Test-only fixture for the inline-SVG charts (OPEN-103). Six records across
// three months and two areas, so the bar chart has groups to compare, the
// donut has segments, and the line chart has enough months to draw.
//
//   id  area due           effort
//   C-1 IT   2026-01-12    4
//   C-2 IT   2026-02-05    6
//   C-3 PR   2026-02-09    2
//   C-4 PR   2026-03-01    8
//   C-5 IT   2026-03-04    1
//   C-6 PR   2026-03-22    3
//
// Hand counts against which the dashboard tests assert:
//   bar area effort    : IT 11, PR 13
//   bar area count     : IT 3, PR 3
//   donut area count   : IT 3, PR 3
//   line due count     : 2026-01=1, 2026-02=2, 2026-03=3
//   line due sum effort: 2026-01=4, 2026-02=8, 2026-03=12

export const SCHEMA = {
  idField: 'id',
  singular: 'task',
  plural: 'tasks',
  titleField: 'title',
  subField: null,
  list: ['title', 'area', 'due', 'effort'],
  facets: ['area'],
  totalField: 'effort',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'area', label: 'Area', type: 'enum', values: ['IT', 'PR'] },
    { key: 'due', label: 'Due', type: 'date' },
    { key: 'effort', label: 'Effort', short: 'E', type: 'number' },
  ],
}

/**
 * Diagramm-Block im neuen einheitlichen Stil (OPEN-103). Beide Schreibweisen
 * nebeneinander, damit der Test sieht, dass die Legacy-Typen 'bar' und
 * 'donut' weiterhin durchgehen.
 */
export const DASHBOARD = {
  tiles: [
    { type: 'bar', groupBy: 'area', measure: 'effort', label: 'Effort by area (legacy)' },
    { type: 'donut', groupBy: 'area', label: 'Share by area (legacy)' },
  ],
  charts: [
    { type: 'chart', kind: 'bar', groupBy: 'area', measure: 'effort', label: 'Effort by area' },
    { type: 'chart', kind: 'bar', groupBy: 'area', measure: 'count', label: 'Tasks by area' },
    { type: 'chart', kind: 'donut', groupBy: 'area', label: 'Share by area' },
    { type: 'chart', kind: 'line', dateField: 'due', aggregate: 'count', label: 'Tasks per month' },
    { type: 'chart', kind: 'line', dateField: 'due', aggregate: 'sum', field: 'effort', label: 'Effort per month' },
    // Bewusst fehlerhaft: unbekanntes Feld und fehlender aggregate - landet
    // als Beanstandungs-Kachel im Raster, nicht stillschweigend im Nichts.
    { type: 'chart', kind: 'line', dateField: 'ghost', label: 'Broken chart' },
  ],
}

export const uid = () =>
  'C-' + Math.random().toString(36).slice(2, 6).toUpperCase() + Date.now().toString(36).slice(-2).toUpperCase()

export const emptyRecord = () => ({ id: uid(), title: '', area: 'IT', due: '', effort: 0 })

export const seed = () => [
  { id: 'C-1', title: 'January task', area: 'IT', due: '2026-01-12', effort: 4 },
  { id: 'C-2', title: 'February task A', area: 'IT', due: '2026-02-05', effort: 6 },
  { id: 'C-3', title: 'February task B', area: 'PR', due: '2026-02-09', effort: 2 },
  { id: 'C-4', title: 'March task A', area: 'PR', due: '2026-03-01', effort: 8 },
  { id: 'C-5', title: 'March task B', area: 'IT', due: '2026-03-04', effort: 1 },
  { id: 'C-6', title: 'March task C', area: 'PR', due: '2026-03-22', effort: 3 },
]

export const isDone = () => false
export const isOverdue = () => false
export const formatDate = (s) => s || ''
