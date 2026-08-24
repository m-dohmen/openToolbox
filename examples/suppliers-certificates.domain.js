// SPDX-License-Identifier: Apache-2.0
// Example domain with two entities and a relationship between them. Copy
// over src/domain.js and run `npm run build`. See the wiki, "Building Your
// Own Tool", section "Multiple entities and relationships".
//
// A domain.js with a single SCHEMA export (like the shipped src/domain.js
// or examples/risk-register.domain.js) is still the right shape for a
// records-with-fields tool that only ever needs ONE kind of record. Reach
// for ENTITIES only once you actually have two or more kinds of records
// that reference each other - here: a certificate always belongs to a
// supplier, and a supplier can have several certificates.

const CATEGORIES = ['Software', 'Hardware', 'Services', 'Consulting']
const CERT_TYPES = ['ISO 27001', 'SOC 2', 'PCI-DSS', 'Other']

// Today (offset by whole days) as a local calendar day, not the UTC date -
// the UTC date would expire certificates one day early west of Greenwich.
const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const ENTITIES = {
  suppliers: {
    schema: {
      idField: 'id',
      singular: 'supplier',
      plural: 'suppliers',
      titleField: 'name',
      subField: 'category',
      list: ['name', 'category', 'contact'],
      facets: ['category'],
      totalField: null,
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'category', label: 'Category', type: 'enum', values: CATEGORIES },
        { key: 'contact', label: 'Contact', type: 'text' },
        { key: 'note', label: 'Note', type: 'text', long: true },
      ],
    },
    uid: () => 'S-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    emptyRecord: () => ({ id: '', name: '', category: CATEGORIES[0], contact: '', note: '' }),
    seed: () => [
      { id: 'S-001', name: 'Nordwind IT GmbH', category: 'Software', contact: 'A. Reinke', note: '' },
      { id: 'S-002', name: 'Rheinmetall Services AG', category: 'Services', contact: 'K. Lorenz', note: '' },
      { id: 'S-003', name: 'Elbe Hardware Solutions', category: 'Hardware', contact: 'T. Krueger', note: '' },
      { id: 'S-004', name: 'Havel Consulting Partners', category: 'Consulting', contact: 'S. Behrens', note: '' },
      { id: 'S-005', name: 'Spree Cloud Systems', category: 'Software', contact: 'M. Voss', note: '' },
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
      subField: null,
      list: ['title', 'supplierId', 'type', 'expiry', 'owner'],
      facets: ['type'],
      totalField: null,
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'supplierId', label: 'Supplier', type: 'reference', entity: 'suppliers', required: true },
        { key: 'type', label: 'Certificate type', short: 'Type', type: 'enum', values: CERT_TYPES },
        { key: 'expiry', label: 'Expiry date', short: 'Expiry', type: 'date' },
        { key: 'owner', label: 'Owner', type: 'text' },
        { key: 'note', label: 'Note', type: 'text', long: true },
      ],
    },
    uid: () => 'C-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    emptyRecord: () => ({ id: '', title: '', supplierId: '', type: CERT_TYPES[0], expiry: '', owner: '', note: '' }),
    seed: () =>
      [
        ['ISO 27001 certification', 'S-001', 'ISO 27001', 'A. Reinke', -14],
        ['Annual SOC 2 report', 'S-001', 'SOC 2', 'A. Reinke', 21],
        ['Service contract compliance cert', 'S-002', 'Other', 'K. Lorenz', -5],
        ['PCI-DSS attestation', 'S-002', 'PCI-DSS', 'K. Lorenz', 45],
        ['Hardware supply ISO 27001', 'S-003', 'ISO 27001', 'T. Krueger', 8],
        ['Consulting NDA renewal cert', 'S-004', 'Other', 'S. Behrens', -2],
        ['SOC 2 Type II report', 'S-005', 'SOC 2', 'M. Voss', 60],
        ['ISO 27001 cloud infrastructure', 'S-005', 'ISO 27001', 'M. Voss', 30],
        ['PCI-DSS quarterly scan', 'S-005', 'PCI-DSS', 'M. Voss', -30],
      ].map(([title, supplierId, type, owner, days], i) => ({
        id: 'C-' + String(101 + i),
        title,
        supplierId,
        type,
        expiry: iso(days),
        owner,
        note: '',
      })),
    isDone: () => false,
    isOverdue: (r) => r.expiry && r.expiry < iso(0),
  },
}

export const formatDate = (s) => {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${m}/${d}/${y}`
}

/**
 * Geführte Erfassung über beide Entitäten: erst der Lieferant, dann sein
 * erstes Zertifikat. Der Entwurf bekommt seine Id zu Beginn des Durchlaufs -
 * nur deshalb kann das Referenzfeld im zweiten Schritt schon auf den
 * Lieferanten aus dem ersten zeigen.
 */
export const WIZARD = {
  title: 'Onboard a supplier',
  intro: 'The supplier first, then its first certificate. Nothing is written until the last step.',
  steps: [
    {
      id: 'supplier',
      label: 'Supplier',
      entity: 'suppliers',
      fields: ['name', 'category', 'contact', 'note'],
    },
    {
      id: 'certificate',
      label: 'First certificate',
      entity: 'certificates',
      fields: ['title', 'supplierId', 'type', 'expiry', 'owner'],
      when: (drafts) => Boolean(drafts.suppliers?.name),
    },
    { id: 'check', label: 'Check', type: 'review' },
  ],
  done: { message: 'The supplier is on file.', allowAnother: true },
}
