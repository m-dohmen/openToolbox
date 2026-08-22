// SPDX-License-Identifier: Apache-2.0
/**
 * Prüffixture für globale Suche und Feldfilter: zwei Entitäten, von denen
 * eine ("log") überhaupt kein Feld eines filterbaren Typs besitzt - nur ein
 * berechnetes Titelfeld und einen Anhang. Für sie darf weder der
 * Filterbereich noch ein Filter-Chip erscheinen; gefunden wird sie von der
 * globalen Suche trotzdem.
 */
export const ENTITIES = {
  things: {
    schema: {
      idField: 'id',
      singular: 'thing',
      plural: 'things',
      titleField: 'name',
      list: ['name', 'kind', 'size', 'checked'],
      facets: [],
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'kind', label: 'Kind', type: 'enum', values: ['red', 'blue'] },
        { key: 'size', label: 'Size', type: 'number' },
        { key: 'checked', label: 'Checked', type: 'date' },
      ],
    },
    uid: () => 'T-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    emptyRecord: () => ({ id: '', name: '', kind: 'red', size: 0, checked: '' }),
    seed: () => [
      { id: 'T-1', name: 'Alpha thing', kind: 'red', size: 3, checked: '2026-01-10' },
      { id: 'T-2', name: 'Beta thing', kind: 'blue', size: 8, checked: '2026-02-20' },
    ],
    isDone: () => false,
    isOverdue: () => false,
  },

  log: {
    schema: {
      idField: 'id',
      singular: 'log entry',
      plural: 'log entries',
      titleField: 'stamp',
      list: ['stamp', 'file'],
      facets: [],
      fields: [
        // Berechnet und damit kein filterbarer Typ - die Suche trifft ihn trotzdem.
        { key: 'stamp', label: 'Stamp', type: 'computed', compute: (r) => r.at },
        { key: 'file', label: 'File', type: 'attachment' },
      ],
    },
    uid: () => 'L-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    emptyRecord: () => ({ id: '', at: '', file: null }),
    seed: () => [{ id: 'L-1', at: '2026-08-01 09:30', file: null }],
    isDone: () => false,
    isOverdue: () => false,
  },
}

export const formatDate = (s) => s || '—'
