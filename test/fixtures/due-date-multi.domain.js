// SPDX-License-Identifier: Apache-2.0
// Test-only multi-entity fixture for the due-date dashboard widget
// (test/multi-entity.mjs). "projects" has a date field but does not declare
// it as dueDate - proving the widget only ever reads an entity that opted in
// by name, not any date-shaped field it happens to find. "milestones" does
// declare it and carries all three groups plus a done record, so the widget
// has to aggregate across entities, filter the done one out, and navigate
// back to whichever entity a clicked item belongs to.
//
// Clock fixed to 2026-08-17T09:00:00 (Monday) by the test before load - see
// test/fixtures/due-date.domain.js for the resulting week/window boundaries.
export const ENTITIES = {
  projects: {
    schema: {
      idField: 'id',
      singular: 'project',
      plural: 'projects',
      titleField: 'name',
      list: ['name', 'started'],
      facets: [],
      search: ['id', 'name'],
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'started', label: 'Started', type: 'date' },
      ],
    },
    uid: () => 'P-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    emptyRecord: () => ({ id: '', name: '', started: '' }),
    seed: () => [{ id: 'P-1', name: 'Rollout', started: '2026-01-01' }],
    isDone: () => false,
    isOverdue: () => false,
  },
  milestones: {
    schema: {
      idField: 'id',
      singular: 'milestone',
      plural: 'milestones',
      titleField: 'title',
      list: ['title', 'projectId', 'due', 'status'],
      facets: ['status'],
      search: ['id', 'title'],
      dueDate: 'due',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'projectId', label: 'Project', type: 'reference', entity: 'projects', required: true },
        { key: 'due', label: 'Due date', type: 'date' },
        { key: 'status', label: 'Status', type: 'enum', values: ['open', 'done'] },
      ],
    },
    uid: () => 'M-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    emptyRecord: () => ({ id: '', title: '', projectId: '', due: '', status: 'open' }),
    seed: () => [
      { id: 'M-1', title: 'Kickoff overdue', projectId: 'P-1', due: '2026-08-01', status: 'open' },
      { id: 'M-2', title: 'Review this week', projectId: 'P-1', due: '2026-08-20', status: 'open' },
      { id: 'M-3', title: 'Audit upcoming', projectId: 'P-1', due: '2026-09-01', status: 'open' },
      { id: 'M-4', title: 'Done milestone', projectId: 'P-1', due: '2026-08-02', status: 'done' },
    ],
    isDone: (r) => r.status === 'done',
    isOverdue: (r) => Boolean(r.due) && r.due < '2026-08-17' && r.status !== 'done',
  },
}

export const formatDate = (s) => s || ''
