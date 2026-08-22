// SPDX-License-Identifier: Apache-2.0
// Test-only fixture for the metric tiles (test/smoke.mjs). Not an example for
// users - it exists purely to give the tiles numbers a human can recount from
// this table. Tests swap it in for src/domain.js, build, and swap it back out,
// the same way the due-date fixture works.
//
// The seed is chosen so every expected value stays mental arithmetic:
//
//   id    status  effort
//   M-1   open        2
//   M-2   open        4
//   M-3   done        6
//   M-4   open      2.5     <- the only fraction, exercises decimal formatting
//   M-5   open        0     <- zero counts, it is a real answer
//   M-6   open       12     <- the live-update lever (12 -> 40)
//
// count all = 6 · count open = 5 · sum = 26.5 · avg = 4.416.. -> 4.42
// open sum = 20.5 · open avg = 20.5 / 5 = 4.1 -> "4.10" (two decimals, fixed)
export const SCHEMA = {
  idField: 'id',
  singular: 'task',
  plural: 'tasks',
  titleField: 'title',
  subField: null,
  list: ['title', 'status', 'effort'],
  facets: ['status'],
  search: ['id', 'title'],
  totalField: 'effort',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'status', label: 'Status', type: 'enum', values: ['open', 'done'] },
    { key: 'effort', label: 'Effort', short: 'E', type: 'number' },
  ],

  /**
   * Kennzahlen über dem Bestand - alle drei Kachelformen aus dem Katalog plus
   * eine ungefilterte avg. Die Werte oben im Kopf sind der Handzähler, gegen
   * den der Test anrechnet.
   */
  metrics: [
    { op: 'count', label: 'Tasks in file', caption: 'all statuses' },
    { op: 'count', filter: (r) => r.status !== 'done', label: 'Open tasks' },
    { op: 'sum', field: 'effort', label: 'Total effort' },
    { op: 'avg', field: 'effort', label: 'Average effort' },
    { op: 'avg', field: 'effort', filter: (r) => r.status !== 'done', label: 'Open average' },
  ],
}

export const uid = () => 'M-' + Math.random().toString(36).slice(2, 8).toUpperCase()

export const emptyRecord = () => ({ id: uid(), title: '', status: 'open', effort: 0 })

export const seed = () => [
  { id: 'M-1', title: 'Two days task', status: 'open', effort: 2 },
  { id: 'M-2', title: 'Four days task', status: 'open', effort: 4 },
  { id: 'M-3', title: 'Done six days task', status: 'done', effort: 6 },
  { id: 'M-4', title: 'Half day task', status: 'open', effort: 2.5 },
  { id: 'M-5', title: 'Zero effort task', status: 'open', effort: 0 },
  { id: 'M-6', title: 'Twelve days task', status: 'open', effort: 12 },
]

export const isDone = (r) => r.status === 'done'
export const isOverdue = () => false
export const formatDate = (s) => s || ''
