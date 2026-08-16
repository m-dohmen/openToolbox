// SPDX-License-Identifier: Apache-2.0

export const STATUS = ['open', 'in progress', 'waiting', 'done']

export const AREAS = ['IT Operations', 'Procurement', 'People', 'Quality', 'Organization']

/**
 * Machine readable description of a record. It feeds three things: the
 * instructions sent to the model, the validation of proposed changes and the
 * human readable summary in the chat. Swap this for another tool and the rest
 * of the framework carries over.
 */
export const SCHEMA = {
  idField: 'id',
  singular: 'action item',
  plural: 'action items',

  /** Leading column of the table, rendered with emphasis. */
  titleField: 'title',
  /** Shown as a second line under the title, keeps the table narrow. */
  subField: 'area',
  /** Which fields appear as table columns, in order. */
  list: ['title', 'owner', 'due', 'daysLeft', 'status', 'effort'],
  /** Enum fields listed here become filter groups in the sidebar. */
  facets: ['status', 'area'],
  /** Fields searched by the free text box. */
  search: ['id', 'title', 'owner', 'area', 'note'],
  /** Number field summed up in the overview, null to hide the tile. */
  totalField: 'effort',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'area', label: 'Area', type: 'enum', values: AREAS },
    { key: 'owner', label: 'Owner', type: 'text' },
    { key: 'due', label: 'Due date', short: 'Due', type: 'date' },
    { key: 'status', label: 'Status', type: 'enum', values: STATUS },
    { key: 'effort', label: 'Effort in days', short: 'D', type: 'number' },
    { key: 'note', label: 'Note', type: 'text', long: true },
    /**
     * Berechnetes Feld: steht nie im Datensatz, wird bei jeder Anzeige neu
     * gerechnet. Sortieren und Suchen funktionieren trotzdem darauf, Setzen
     * nicht - weder von Hand noch durch das Modell.
     */
    {
      key: 'daysLeft',
      label: 'Days left',
      short: 'Left',
      type: 'computed',
      compute: (r) => {
        if (!r.due || r.status === 'done') return ''
        const days = Math.round((new Date(r.due) - new Date().setHours(0, 0, 0, 0)) / 86400000)
        return days
      },
    },
  ],
  /**
   * Bedingungen zwischen Feldern. `coerceField` prüft jeden Wert für sich und
   * kann so etwas nicht sehen: dass ein Punkt ohne Verantwortlichen nicht in
   * Arbeit sein kann, weiß nur, wer beide Felder zugleich anschaut.
   *
   * Die Regeln gelten im Formular, beim CSV-Import und für Vorschläge des
   * Modells - eine Stelle, drei Wege. `message` steht in der Sprache, in der
   * das Werkzeug gebaut wurde, wie die Feldbeschriftungen auch.
   */
  rules: [
    {
      when: (r) => r.status === 'in progress' || r.status === 'done',
      require: ['owner'],
      message: 'An item that is under way needs an owner.',
    },
    {
      when: (r) => r.status === 'done',
      check: (r) => Number(r.effort) > 0,
      fields: ['effort'],
      message: 'A closed item needs the effort it actually took.',
    },
  ],
}

export const uid = () =>
  'A-' +
  Math.random().toString(36).slice(2, 6).toUpperCase() +
  Date.now().toString(36).slice(-3).toUpperCase()

export const emptyRecord = () => ({
  id: uid(),
  title: '',
  area: AREAS[0],
  owner: '',
  due: '',
  status: 'open',
  effort: 0,
  note: '',
})

const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export const seed = () =>
  [
    ['Document four-eyes principle in the approval process', 'Organization', 'A. Reinke', -12, 'open', 8],
    ['Update approval thresholds in the workflow', 'Organization', 'A. Reinke', 6, 'in progress', 3],
    ['Sign off test cases for release 26.2', 'IT Operations', 'T. Krueger', -3, 'in progress', 12],
    ['Review interface error returns', 'IT Operations', 'T. Krueger', 21, 'open', 5],
    ['Refresh chapter 4 of the continuity handbook', 'IT Operations', 'S. Behrens', 14, 'open', 6],
    ['Request 2026 vendor attestations', 'Procurement', 'S. Behrens', -1, 'waiting', 2],
    ['Start Q3 access recertification', 'IT Operations', 'M. Voss', 35, 'open', 10],
    ['Recalibrate monitoring thresholds', 'Quality', 'K. Lorenz', 9, 'in progress', 16],
    ['Follow up on mandatory training', 'People', 'K. Lorenz', -20, 'done', 4],
    ['Consolidate the process map', 'Quality', 'D. Ahrens', 45, 'open', 20],
    ['Circulate steering committee minutes', 'Organization', 'D. Ahrens', -8, 'done', 1],
  ].map(([title, area, owner, days, status, effort], i) => ({
    id: 'A-' + String(1041 + i),
    title,
    area,
    owner,
    due: iso(days),
    status,
    effort,
    note: '',
  }))

/** A record that no longer counts towards open effort. */
export const isDone = (r) => r.status === 'done'

export const isOverdue = (r) => !isDone(r) && r.due && r.due < iso(0)

export const formatDate = (s) => {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${m}/${d}/${y}`
}

/**
 * Kacheln über den Bestand, erreichbar über den Umschalter neben der Liste.
 * Fehlt dieser Export, gibt es die Dashboard-Ansicht schlicht nicht.
 *
 *   stat   Eine Zahl. `measure`: 'count' oder ein Feldschlüssel, dessen Werte
 *          summiert werden. `filter` schränkt die Datensätze davor ein.
 *   bar    Balken je Ausprägung von `groupBy` (ein Aufzählungsfeld).
 *   donut  Dieselben Daten als Ring mit Legende.
 */
export const DASHBOARD = {
  tiles: [
    { type: 'stat', measure: 'count', label: 'Action items', caption: 'in this file' },
    {
      type: 'stat',
      measure: 'count',
      filter: (r) => isOverdue(r),
      label: 'Overdue',
      caption: 'past their due date',
    },
    {
      type: 'stat',
      measure: 'effort',
      filter: (r) => !isDone(r),
      label: 'Open effort',
      caption: 'days still to spend',
    },
    { type: 'donut', groupBy: 'status' },
    { type: 'bar', groupBy: 'area', measure: 'effort', label: 'Effort by area' },
    { type: 'bar', groupBy: 'area', measure: 'count', label: 'Items by area' },
  ],
}

/**
 * Geführte Erfassung. Fehlt dieser Export, gibt es den Wizard schlicht nicht -
 * genau wie beim Dashboard entscheidet die Domäne, nicht eine Einstellung.
 *
 * Vier Schritttypen: `fields` (Teilmenge der Schemafelder), `csv` (der
 * vorhandene Import als Schritt, zahlt in denselben Durchlauf ein), `review`
 * (Zusammenfassung, wird aus dem Schema erzeugt) und der Abschluss aus `done`.
 *
 * `when(drafts)` blendet einen Schritt aus, wenn er nicht passt - `drafts` ist
 * ein Objekt je Entität, bei einem einzigen Datensatztyp also `drafts.records`.
 */
export const WIZARD = {
  title: 'Report an action item',
  intro:
    'Four short steps. Nothing is written until the last one, so you can go back at any point.',
  steps: [
    { id: 'what', label: 'What', fields: ['title', 'area', 'note'] },
    { id: 'who', label: 'Who and when', fields: ['owner', 'due', 'status', 'effort'] },
    {
      id: 'bulk',
      label: 'Several at once',
      type: 'csv',
      // Nur anbieten, wenn der Einzelfall schon erfasst ist - sonst steht der
      // Massenimport vor der Frage, um die es eigentlich geht.
      when: (drafts) => Boolean(drafts.records?.title),
    },
    { id: 'check', label: 'Check', type: 'review' },
  ],
  done: {
    message: 'Thank you — that is recorded.',
    allowAnother: true,
  },
}
