// SPDX-License-Identifier: Apache-2.0
// Test-only fixture for the due-date dashboard widget (test/smoke.mjs).
// Not an example for users - it exists purely to give the widget something
// to group. Tests swap it in for src/domain.js, build, and swap it back out
// again, the same way test/multi-entity.mjs does with an example domain.
//
// The clock is fixed to 2026-08-17T09:00:00 (a Monday) by the test before the
// page loads, so "this week" runs 2026-08-17..2026-08-23 and "next 30 days"
// runs 2026-08-24..2026-09-22. None of the seed records fall in that upcoming
// window - on purpose, to prove an empty group stays hidden rather than
// showing as an empty heading.
export const SCHEMA = {
  idField: 'id',
  singular: 'task',
  plural: 'tasks',
  titleField: 'title',
  subField: null,
  list: ['title', 'due', 'status'],
  facets: ['status'],
  search: ['id', 'title'],
  totalField: null,
  dueDate: 'due',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'due', label: 'Due date', short: 'Due', type: 'date' },
    { key: 'status', label: 'Status', type: 'enum', values: ['open', 'done'] },
  ],
}

export const uid = () => 'T-' + Math.random().toString(36).slice(2, 8).toUpperCase()

export const emptyRecord = () => ({ id: uid(), title: '', due: '', status: 'open' })

export const seed = () => [
  { id: 'T-1', title: 'Overdue task', due: '2026-08-10', status: 'open' },
  { id: 'T-2', title: 'This week task', due: '2026-08-19', status: 'open' },
  { id: 'T-3', title: 'Far future task', due: '2027-01-01', status: 'open' },
  { id: 'T-4', title: 'Done overdue task', due: '2026-08-05', status: 'done' },
  { id: 'T-5', title: 'No due date task', due: '', status: 'open' },
]

export const isDone = (r) => r.status === 'done'
export const isOverdue = (r) => Boolean(r.due) && r.due < '2026-08-17' && r.status !== 'done'
export const formatDate = (s) => s || ''
