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
  { id: 'R-004', name: 'Vendor attestations overdue', category: 'Operational', owner: 'S. Behrens', review: '2026-06-30', likelihood: 'medium', impact: 6, mitigation: '' },
  { id: 'R-005', name: 'Access recertification skipped last cycle', category: 'IT', owner: 'M. Voss', review: '2026-11-05', likelihood: 'high', impact: 10, mitigation: '' },
  { id: 'R-006', name: 'Data processing agreement expired', category: 'Legal', owner: 'D. Ahrens', review: '2026-08-01', likelihood: 'medium', impact: 9, mitigation: '' },
  { id: 'R-007', name: 'No documented fallback for approval workflow', category: 'Operational', owner: 'A. Reinke', review: '2026-12-15', likelihood: 'low', impact: 4, mitigation: '' },
  { id: 'R-008', name: 'Monitoring thresholds not recalibrated', category: 'IT', owner: 'K. Lorenz', review: '2026-09-20', likelihood: 'medium', impact: 7, mitigation: '' },
  { id: 'R-009', name: 'Training records incomplete', category: 'Legal', owner: 'T. Krueger', review: '2026-07-01', likelihood: 'low', impact: 3, mitigation: '' },
]
export const isDone = () => false
// Today as a local calendar day - the UTC date would flag items one day
// too early west of Greenwich.
const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const isOverdue = (r) => r.review && r.review < iso(0)
export const formatDate = (s) => (s ? `${s.slice(5, 7)}/${s.slice(8, 10)}/${s.slice(0, 4)}` : '—')
