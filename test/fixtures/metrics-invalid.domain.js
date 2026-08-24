// SPDX-License-Identifier: Apache-2.0
// Test-only fixture for REJECTED metric declarations (test/smoke.mjs). Three
// of the four declarations are invalid in a different way each, one is valid
// and must survive next to them:
//
//   'total'  -> not part of the closed catalog (no eval'd string metrics)
//   sum over 'title' -> text field, not numeric
//   avg without any field -> nothing to average
//
// The point is the loud refusal: the dashboard names every rejection instead
// of silently dropping it - a metric that quietly disappears is noticed only
// when somebody misses the number.
export const SCHEMA = {
  idField: 'id',
  singular: 'task',
  plural: 'tasks',
  titleField: 'title',
  subField: null,
  list: ['title', 'effort'],
  facets: [],
  search: ['id', 'title'],
  totalField: null,
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'effort', label: 'Effort', short: 'E', type: 'number' },
  ],
  metrics: [
    { op: 'total', field: 'effort', label: 'Broken op' },
    { op: 'sum', field: 'title', label: 'Sum of text' },
    { op: 'avg', field: 'nonexistent', label: 'Avg of nothing' },
    { op: 'count', label: 'Valid count' },
  ],
}

export const uid = () => 'M-' + Math.random().toString(36).slice(2, 8).toUpperCase()

export const emptyRecord = () => ({ id: uid(), title: '', effort: 0 })

export const seed = () => [
  { id: 'M-1', title: 'One task', effort: 1 },
  { id: 'M-2', title: 'Another task', effort: 3 },
]

export const isDone = () => false
export const isOverdue = () => false
export const formatDate = (s) => s || ''
