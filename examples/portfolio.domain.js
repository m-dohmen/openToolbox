// SPDX-License-Identifier: Apache-2.0
/**
 * Showcase domain — a project portfolio, the way a PMO or a consulting
 * engagement lead actually keeps one.
 *
 * This example deliberately uses every feature the framework has at once, so
 * that one build shows the whole thing:
 *
 *   - two entities with a relationship (a milestone belongs to a project)
 *   - a reference field, resolved to the project name and clickable
 *   - calculated fields on both entities (budget variance, days remaining)
 *   - facets, free-text search, an overview total
 *   - overdue logic that differs per entity
 *   - a dashboard reporting across both entities
 *   - a `dueDate` declaration on milestones, feeding the due-date widget
 *   - `metrics` on both entities — count with criterion, sum and avg,
 *     computed at render time and shown as tiles above the dashboard
 *
 * Copy it over src/domain.js and run `npm run build` to see it. A real tool
 * would normally use rather less than this — most need one entity and no
 * dashboard. See AGENTS.md.
 */

const PHASES = ['Initiation', 'Delivery', 'Rollout', 'Closed']
const RISKS = ['low', 'medium', 'high']
const STATUS = ['open', 'in progress', 'waiting', 'done']

const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

const today = () => iso(0)

export const ENTITIES = {
  projects: {
    schema: {
      idField: 'id',
      singular: 'project',
      plural: 'projects',
      titleField: 'name',
      subField: 'client',
      list: ['name', 'lead', 'phase', 'risk', 'budget', 'variance', 'end'],
      facets: ['phase', 'risk'],
      search: ['id', 'name', 'client', 'lead'],
      totalField: 'budget',
      /* Kennzahl-Kacheln: die Zahlen, die ein Lenkungskreis zuerst sehen will.
         count mit Kriterium, Summe und Mittelwert - gerechnet beim Rendern,
         nicht gespeichert. Alle Formen des geschlossenen Katalogs kommen vor. */
      metrics: [
        { op: 'count', filter: (r) => r.phase !== 'Closed', label: 'Running projects', caption: 'not yet closed' },
        { op: 'sum', field: 'spent', label: 'Spent so far', caption: 'kEUR, all projects' },
        { op: 'avg', field: 'budget', label: 'Average budget', caption: 'kEUR per project' },
      ],
      fields: [
        { key: 'name', label: 'Project', type: 'text', required: true },
        { key: 'client', label: 'Client', type: 'text' },
        { key: 'lead', label: 'Engagement lead', short: 'Lead', type: 'text' },
        { key: 'phase', label: 'Phase', type: 'enum', values: PHASES },
        { key: 'risk', label: 'Risk', type: 'enum', values: RISKS },
        { key: 'budget', label: 'Budget in kEUR', short: 'Budget', type: 'number' },
        { key: 'spent', label: 'Spent in kEUR', short: 'Spent', type: 'number' },
        { key: 'start', label: 'Start', type: 'date' },
        { key: 'end', label: 'Planned end', short: 'End', type: 'date' },
        {
          key: 'variance',
          label: 'Budget left',
          short: 'Left',
          type: 'computed',
          compute: (r) => (Number(r.budget) || 0) - (Number(r.spent) || 0),
        },
        { key: 'note', label: 'Note', type: 'text', long: true },
      ],
      /* Bedingungen zwischen Feldern. Gelten im Formular, beim CSV-Import und
         fuer Vorschlaege des Modells - eine Stelle, drei Wege. */
      rules: [
        {
          when: (r) => r.phase !== 'Initiation',
          require: ['lead'],
          message: 'A project past initiation needs an engagement lead.',
        },
        {
          when: (r) => r.start && r.end,
          check: (r) => r.end >= r.start,
          fields: ['end'],
          message: 'The planned end cannot be before the start.',
        },
      ],
    },
    uid: () => 'P-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    emptyRecord: () => ({
      id: '',
      name: '',
      client: '',
      lead: '',
      phase: PHASES[0],
      risk: 'low',
      budget: 0,
      spent: 0,
      start: '',
      end: '',
      note: '',
    }),
    seed: () =>
      [
        ['Core banking migration', 'Sparkasse Rheinland', 'A. Reinke', 'Delivery', 'high', 1250, 890, -120, 95],
        ['Payments platform consolidation', 'Volksbank Nord', 'K. Lorenz', 'Delivery', 'medium', 780, 410, -60, 140],
        ['Regulatory reporting overhaul', 'Landesbank Sued', 'T. Krueger', 'Rollout', 'high', 2100, 1980, -300, -8],
        ['Cloud migration wave 2', 'Sparkasse Rheinland', 'M. Voss', 'Initiation', 'low', 460, 35, -20, 210],
        ['Customer portal relaunch', 'Direktbank24', 'S. Behrens', 'Delivery', 'medium', 640, 520, -150, 60],
        ['Data warehouse decommissioning', 'Volksbank Nord', 'D. Ahrens', 'Closed', 'low', 320, 298, -400, -30],
        ['KYC process automation', 'Direktbank24', 'A. Reinke', 'Rollout', 'medium', 890, 705, -180, 45],
      ].map(([name, client, lead, phase, risk, budget, spent, startDays, endDays], i) => ({
        id: 'P-' + String(101 + i),
        name,
        client,
        lead,
        phase,
        risk,
        budget,
        spent,
        start: iso(startDays),
        end: iso(endDays),
        note: '',
      })),
    isDone: (r) => r.phase === 'Closed',
    isOverdue: (r) => r.phase !== 'Closed' && r.end && r.end < today(),
  },

  milestones: {
    schema: {
      idField: 'id',
      singular: 'milestone',
      plural: 'milestones',
      titleField: 'title',
      subField: null,
      list: ['title', 'projectId', 'owner', 'due', 'daysLeft', 'status', 'effort'],
      facets: ['status'],
      search: ['id', 'title', 'owner'],
      totalField: 'effort',
      dueDate: 'due',
      /* Dieselben drei Formen, zweite Entität: wie viel Arbeit liegt auf den
         Meilensteinen, und wie viel davon läuft gerade. */
      metrics: [
        { op: 'count', filter: (r) => r.status === 'in progress', label: 'Milestones in progress' },
        { op: 'avg', field: 'effort', label: 'Average effort', caption: 'days per milestone' },
      ],
      fields: [
        { key: 'title', label: 'Milestone', type: 'text', required: true },
        { key: 'projectId', label: 'Project', type: 'reference', entity: 'projects', required: true },
        { key: 'owner', label: 'Owner', type: 'text' },
        { key: 'due', label: 'Due date', short: 'Due', type: 'date' },
        { key: 'status', label: 'Status', type: 'enum', values: STATUS },
        { key: 'effort', label: 'Effort in days', short: 'D', type: 'number' },
        {
          key: 'daysLeft',
          label: 'Days left',
          short: 'Left',
          type: 'computed',
          compute: (r) => {
            if (!r.due || r.status === 'done') return ''
            return Math.round((new Date(r.due) - new Date().setHours(0, 0, 0, 0)) / 86400000)
          },
        },
        { key: 'note', label: 'Note', type: 'text', long: true },
      ],
      rules: [
        {
          when: (r) => r.status !== 'open',
          require: ['owner'],
          message: 'A milestone that has started needs an owner.',
        },
      ],
    },
    uid: () => 'M-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    emptyRecord: () => ({
      id: '',
      title: '',
      projectId: '',
      owner: '',
      due: '',
      status: 'open',
      effort: 0,
      note: '',
    }),
    seed: () =>
      [
        ['Target architecture signed off', 'P-101', 'A. Reinke', -12, 'done', 15],
        ['Data migration dry run', 'P-101', 'T. Krueger', 8, 'in progress', 22],
        ['Cutover rehearsal', 'P-101', 'A. Reinke', 0, 'open', 18],
        ['SEPA interface certified', 'P-102', 'K. Lorenz', -4, 'waiting', 9],
        ['Legacy adapter retired', 'P-102', 'K. Lorenz', 41, 'open', 12],
        ['BaFin report format approved', 'P-103', 'T. Krueger', -20, 'done', 11],
        ['Parallel run completed', 'P-103', 'T. Krueger', 5, 'in progress', 26],
        ['Landing zone provisioned', 'P-104', 'M. Voss', 60, 'open', 14],
        ['Design system handover', 'P-105', 'S. Behrens', -2, 'in progress', 8],
        ['Accessibility audit passed', 'P-105', 'S. Behrens', 27, 'open', 6],
        ['Final data extract archived', 'P-106', 'D. Ahrens', -35, 'done', 4],
        ['ID verification vendor live', 'P-107', 'A. Reinke', 12, 'in progress', 16],
        ['Manual review queue retired', 'P-107', 'A. Reinke', 48, 'open', 10],
      ].map(([title, projectId, owner, days, status, effort], i) => ({
        id: 'M-' + String(201 + i),
        title,
        projectId,
        owner,
        due: iso(days),
        status,
        effort,
        note: '',
      })),
    isDone: (r) => r.status === 'done',
    isOverdue: (r) => r.status !== 'done' && r.due && r.due < today(),
  },
}

export const formatDate = (s) => {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

/** Kacheln über beide Entitäten hinweg - `entity` sagt, worauf sich eine bezieht. */
export const DASHBOARD = {
  tiles: [
    {
      type: 'stat',
      entity: 'projects',
      measure: 'budget',
      filter: (r) => r.phase !== 'Closed',
      label: 'Portfolio budget',
      caption: 'kEUR, running projects',
    },
    {
      type: 'stat',
      entity: 'projects',
      measure: 'count',
      filter: (r) => r.risk === 'high',
      label: 'High risk',
      caption: 'projects needing attention',
    },
    {
      type: 'stat',
      entity: 'milestones',
      measure: 'count',
      filter: (r) => r.status !== 'done' && r.due && r.due < today(),
      label: 'Overdue milestones',
      caption: 'across all projects',
    },
    { type: 'donut', entity: 'projects', groupBy: 'phase', label: 'Projects by phase' },
    { type: 'bar', entity: 'projects', groupBy: 'phase', measure: 'budget', label: 'Budget by phase' },
    { type: 'donut', entity: 'milestones', groupBy: 'status', label: 'Milestones by status' },
  ],
}

/**
 * Geführte Erfassung über zwei Entitäten hinweg: erst das Projekt, dann ein
 * Meilenstein dazu. Die Entwürfe bekommen ihre Id zu Beginn des Durchlaufs -
 * deshalb kann das Referenzfeld im zweiten Schritt schon auf das Projekt aus
 * dem ersten zeigen.
 */
export const WIZARD = {
  title: 'Add an engagement',
  intro: 'Three steps: the engagement, its first milestone, then a check before anything is written.',
  steps: [
    {
      id: 'project',
      label: 'Engagement',
      entity: 'projects',
      fields: ['name', 'client', 'lead', 'phase', 'risk', 'budget', 'start', 'end'],
    },
    {
      id: 'milestone',
      label: 'First milestone',
      entity: 'milestones',
      fields: ['title', 'projectId', 'owner', 'due', 'status', 'effort'],
      // Ein Vorschlag ohne Zusage braucht noch keinen Meilenstein.
      when: (drafts) => drafts.projects?.phase !== 'Initiation',
    },
    {
      id: 'more',
      label: 'More milestones',
      entity: 'milestones',
      type: 'csv',
      when: (drafts) => Boolean(drafts.projects?.name),
    },
    { id: 'check', label: 'Check', type: 'review' },
  ],
  done: { message: 'The engagement is in the file.', allowAnother: true },
}
