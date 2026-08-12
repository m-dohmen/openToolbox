// SPDX-License-Identifier: Apache-2.0
// Example schema. Copy over src/domain.js and run `npm run build`.
// Gegenprobe: voellig anderes Schema, nur domain.js getauscht
export const SCHEMA = {
  idField: 'id',
  singular: 'risk',
  plural: 'risks',
  titleField: 'name',
  subField: 'category',
  list: ['name', 'owner', 'review', 'likelihood', 'impact'],
  facets: ['likelihood', 'category'],
  search: ['id', 'name', 'owner', 'category'],
  totalField: 'impact',
  fields: [
    { key: 'name', label: 'Risk', type: 'text', required: true },
    { key: 'category', label: 'Category', type: 'enum', values: ['Operational', 'Legal', 'IT'] },
    { key: 'owner', label: 'Owner', type: 'text' },
    { key: 'review', label: 'Review date', short: 'Review', type: 'date' },
    { key: 'likelihood', label: 'Likelihood', type: 'enum', values: ['low', 'medium', 'high'] },
    { key: 'impact', label: 'Impact score', short: 'Score', type: 'number' },
    { key: 'mitigation', label: 'Mitigation', type: 'text', long: true },
  ],
}
export const uid = () => 'R-' + Math.random().toString(36).slice(2, 7).toUpperCase()
export const emptyRecord = () => ({ id: uid(), name: '', category: 'Operational', owner: '', review: '', likelihood: 'low', impact: 0, mitigation: '' })
export const seed = () => [
  { id: 'R-001', name: 'Single supplier for core service', category: 'Operational', owner: 'A. Reinke', review: '2026-09-01', likelihood: 'medium', impact: 8, mitigation: '' },
  { id: 'R-002', name: 'Retention period unclear', category: 'Legal', owner: 'K. Lorenz', review: '2026-07-15', likelihood: 'high', impact: 12, mitigation: '' },
  { id: 'R-003', name: 'No tested restore for archive', category: 'IT', owner: 'T. Krueger', review: '2026-10-20', likelihood: 'low', impact: 5, mitigation: '' },
]
export const isDone = () => false
export const isOverdue = (r) => r.review && r.review < new Date().toISOString().slice(0, 10)
export const formatDate = (s) => (s ? `${s.slice(5, 7)}/${s.slice(8, 10)}/${s.slice(0, 4)}` : '—')
