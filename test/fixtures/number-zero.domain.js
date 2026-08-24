// SPDX-License-Identifier: Apache-2.0
// Test-only fixture for the number cell rendering (test/smoke.mjs).
// Not an example for users - it exists purely to put a stored 0 and a stored
// empty value of the same number field side by side in one table. Tests swap
// it in for src/domain.js, build, and swap it back out again, the same way
// the other fixtures do.
//
// A cost of zero is a real answer (see AGENTS.md, validation rules): the list
// has to show "0" for the first record while an actually empty field keeps
// showing the placeholder dash.
export const SCHEMA = {
  idField: 'id',
  singular: 'budget item',
  plural: 'budget items',
  titleField: 'title',
  subField: null,
  list: ['title', 'amount'],
  facets: [],
  search: ['id', 'title'],
  totalField: 'amount',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'amount', label: 'Amount', type: 'number' },
  ],
}

export const uid = () => 'B-' + Math.random().toString(36).slice(2, 8).toUpperCase()

export const emptyRecord = () => ({ id: uid(), title: '', amount: '' })

export const seed = () => [
  { id: 'B-1', title: 'Zero budget', amount: 0 },
  { id: 'B-2', title: 'No amount yet', amount: '' },
]

export const isDone = () => false
export const isOverdue = () => false
export const formatDate = (s) => s || ''
