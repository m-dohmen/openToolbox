// SPDX-License-Identifier: Apache-2.0
// Test-only multi-entity fixture for the metric tiles (test/multi-entity.mjs).
// "suppliers" declares no metrics - proving a metric tile belongs to the
// entity that declared it and no default drags in the entity that happens to
// be open. "certificates" carries an unlabeled count (default label = plural)
// and a sum, so the click navigation has something to jump to across entities.
export const ENTITIES = {
  suppliers: {
    schema: {
      idField: 'id',
      singular: 'supplier',
      plural: 'suppliers',
      titleField: 'name',
      list: ['name'],
      facets: [],
      search: ['id', 'name'],
      fields: [{ key: 'name', label: 'Name', type: 'text', required: true }],
    },
    uid: () => 'S-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    emptyRecord: () => ({ id: '', name: '' }),
    seed: () => [
      { id: 'S-1', name: 'Nordwind IT GmbH' },
      { id: 'S-2', name: 'Suedwind Logistik GmbH' },
    ],
    isDone: () => false,
    isOverdue: () => false,
  },
  certificates: {
    schema: {
      idField: 'id',
      singular: 'certificate',
      plural: 'certificates',
      titleField: 'title',
      list: ['title', 'amount'],
      facets: [],
      search: ['id', 'title'],
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'amount', label: 'Amount', type: 'number' },
      ],
      // Kein Label am count - der Plural tritt als Vorgabe ein. Summe: 400.
      metrics: [
        { op: 'count' },
        { op: 'sum', field: 'amount', label: 'Certified volume' },
      ],
    },
    uid: () => 'C-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    emptyRecord: () => ({ id: '', title: '', amount: 0 }),
    seed: () => [
      { id: 'C-1', title: 'ISO 27001', amount: 100 },
      { id: 'C-2', title: 'ISO 9001', amount: 250 },
      { id: 'C-3', title: 'TISAX', amount: 50 },
    ],
    isDone: () => false,
    isOverdue: () => false,
  },
}

export const formatDate = (s) => s || ''
