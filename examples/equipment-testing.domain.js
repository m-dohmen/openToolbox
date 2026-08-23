// SPDX-License-Identifier: Apache-2.0
/**
 * Prüfung ortsveränderlicher elektrischer Betriebsmittel (DGUV Vorschrift 3).
 *
 * Der Fall: jeder Handwerksbetrieb, jede Werkstatt, jede Kita hat Geräte, die
 * regelmäßig geprüft werden müssen — Bohrmaschine, Verlängerungskabel,
 * Kaffeemaschine, Heißluftgebläse. Die Prüfung selbst dauert Minuten. Die
 * Verwaltung frisst den Nachmittag, weil das Prüfprotokoll in einem Ordner
 * liegt, die Fristen im Kopf des Meisters und die Frage der Berufsgenossen-
 * schaft nach einem Unfall lautet: *wann wurde dieses Gerät zuletzt geprüft?*
 *
 * Diese Domäne ist bewusst **fast vollständig datumsgetrieben**. Nichts wird
 * summiert, alles wird gerechnet: Fälligkeit aus Intervall und letzter
 * Prüfung, Restzeit in Tagen, Ampel daraus. Das ist die dritte Datenform neben
 * „viele Aufzählungen" und „viel Geld" — und die, bei der ein berechnetes Feld
 * am meisten spart.
 *
 * Alle Daten sind erfunden.
 */

const KINDS = ['Handmaschine', 'Verlängerung/Leitung', 'Küchengerät', 'Messgerät', 'Ladegerät', 'Ortsfest']
const LOCATIONS = ['Werkstatt', 'Baustellenwagen', 'Lager', 'Büro', 'Küche', 'ausgeliehen']
const RESULTS = ['bestanden', 'bestanden mit Mangel', 'nicht bestanden', 'noch nicht geprüft']
const INTERVALS = [6, 12, 24]

const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

/** Fälligkeit: letzte Prüfung plus Intervall in Monaten. */
const dueDate = (r) => {
  if (!r.lastTest) return ''
  const d = new Date(r.lastTest)
  d.setMonth(d.getMonth() + (Number(r.interval) || 12))
  return d.toISOString().slice(0, 10)
}

export const SCHEMA = {
  idField: 'id',
  singular: 'Betriebsmittel',
  plural: 'Betriebsmittel',
  titleField: 'name',
  subField: 'location',
  list: ['name', 'kind', 'location', 'lastTest', 'due', 'daysLeft', 'result'],
  facets: ['kind', 'location', 'result'],
  totalField: null,
  fields: [
    { key: 'name', label: 'Gerät', type: 'text', required: true },
    { key: 'kind', label: 'Art', type: 'enum', values: KINDS },
    { key: 'serial', label: 'Inventar-/Seriennummer', short: 'Nr.', type: 'text' },
    { key: 'location', label: 'Standort', short: 'Ort', type: 'enum', values: LOCATIONS },
    { key: 'holder', label: 'In der Hand von', short: 'Bei', type: 'text' },
    {
      key: 'interval',
      label: 'Prüfintervall (Monate)',
      short: 'Int.',
      type: 'enum',
      // Als Aufzählung statt als Zahl: die BG kennt keine 7-Monats-Intervalle.
      values: INTERVALS.map(String),
    },
    { key: 'lastTest', label: 'Letzte Prüfung', short: 'Geprüft', type: 'date' },
    { key: 'tester', label: 'Prüfer', type: 'text' },
    { key: 'result', label: 'Ergebnis', type: 'enum', values: RESULTS },
    { key: 'defect', label: 'Festgestellter Mangel', short: 'Mangel', type: 'text', long: true },
    { key: 'protocol', label: 'Prüfprotokoll', short: 'Protokoll', type: 'attachment' },
    { key: 'note', label: 'Notiz', type: 'text', long: true },
    {
      key: 'due',
      label: 'Nächste Prüfung',
      short: 'Fällig',
      type: 'computed',
      compute: (r) => {
        const d = dueDate(r)
        if (!d) return ''
        const [y, m, day] = d.split('-')
        return `${day}.${m}.${y}`
      },
    },
    {
      key: 'daysLeft',
      label: 'Tage bis zur Prüfung',
      short: 'Tage',
      type: 'computed',
      compute: (r) => {
        const d = dueDate(r)
        if (!d) return ''
        return Math.round((new Date(d) - new Date().setHours(0, 0, 0, 0)) / 86400000)
      },
    },
  ],
  rules: [
    {
      when: (r) => r.result !== 'noch nicht geprüft',
      require: ['lastTest', 'tester'],
      message: 'Ein Prüfergebnis ohne Datum und Prüfer ist im Ernstfall wertlos.',
    },
    {
      when: (r) => r.result === 'bestanden mit Mangel' || r.result === 'nicht bestanden',
      require: ['defect'],
      message: 'Zu einem Mangel gehört, worin er besteht.',
    },
    {
      when: (r) => r.result === 'nicht bestanden',
      require: ['note'],
      message: 'Bei „nicht bestanden" gehört in die Notiz, wo das Gerät jetzt ist — es darf nicht weiterlaufen.',
    },
  ],
}

export const uid = () => 'BM-' + Math.random().toString(36).slice(2, 6).toUpperCase()

export const emptyRecord = () => ({
  id: '',
  name: '',
  kind: KINDS[0],
  serial: '',
  location: LOCATIONS[0],
  holder: '',
  interval: '12',
  lastTest: '',
  tester: '',
  result: 'noch nicht geprüft',
  defect: '',
  protocol: null,
  note: '',
})

export const seed = () =>
  [
    ['BM-1001', 'Bohrhammer Bosch GBH', 'Handmaschine', 'W-0412', 'Baustellenwagen', 'T. Krüger', '6', -220, 'S. Behrens', 'bestanden', '', ''],
    ['BM-1002', 'Verlängerung 25 m orange', 'Verlängerung/Leitung', 'K-118', 'Baustellenwagen', 'T. Krüger', '6', -170, 'S. Behrens', 'bestanden mit Mangel', 'Zugentlastung am Stecker locker, provisorisch gesichert', ''],
    ['BM-1003', 'Winkelschleifer klein', 'Handmaschine', 'W-0508', 'Werkstatt', 'A. Reinke', '6', -30, 'S. Behrens', 'bestanden', '', ''],
    ['BM-1004', 'Kabeltrommel 50 m', 'Verlängerung/Leitung', 'K-201', 'Lager', '', '6', -400, 'S. Behrens', 'nicht bestanden', 'Isolationswiderstand unter Grenzwert', 'Gesperrt, liegt im Lager im roten Regal. Ersatz bestellt.'],
    ['BM-1005', 'Stichsäge', 'Handmaschine', 'W-0377', 'Werkstatt', 'A. Reinke', '12', -95, 'S. Behrens', 'bestanden', '', ''],
    ['BM-1006', 'Kaffeemaschine Büro', 'Küchengerät', 'B-006', 'Küche', '', '24', -300, 'externer Dienstleister', 'bestanden', '', ''],
    ['BM-1007', 'Wasserkocher', 'Küchengerät', 'B-007', 'Küche', '', '24', -740, 'externer Dienstleister', 'bestanden', '', ''],
    ['BM-1008', 'Heißluftgebläse', 'Handmaschine', 'W-0455', 'Baustellenwagen', 'M. Voss', '6', -140, 'S. Behrens', 'bestanden', '', ''],
    ['BM-1009', 'Leitungssucher', 'Messgerät', 'M-011', 'Werkstatt', 'A. Reinke', '12', -20, 'S. Behrens', 'bestanden', '', ''],
    ['BM-1010', 'Akkuladegerät 18 V', 'Ladegerät', 'W-0501', 'ausgeliehen', 'D. Ahrens', '12', -365, 'S. Behrens', 'bestanden', '', 'Seit dem Umbau bei D. Ahrens im Wagen.'],
    ['BM-1011', 'Baustrahler LED', 'Handmaschine', 'W-0480', 'Baustellenwagen', 'M. Voss', '6', null, '', 'noch nicht geprüft', '', 'Neu beschafft, Erstprüfung steht aus.'],
    ['BM-1012', 'Standbohrmaschine', 'Ortsfest', 'W-0100', 'Werkstatt', '', '24', -560, 'externer Dienstleister', 'bestanden', '', ''],
  ].map(([id, name, kind, serial, location, holder, interval, days, tester, result, defect, note]) => ({
    id,
    name,
    kind,
    serial,
    location,
    holder,
    interval,
    lastTest: days === null ? '' : iso(days),
    tester,
    result,
    defect,
    protocol: null,
    note,
  }))

/* „Erledigt" gibt es hier nicht: eine Prüfung ist nie fertig, sie ist nur eine
   Weile her. Deshalb false - der Übersichtszähler zählt alle Geräte. */
export const isDone = () => false

/** Fällig oder gesperrt: beides gehört rot. */
export const isOverdue = (r) => {
  if (r.result === 'nicht bestanden') return true
  const d = dueDate(r)
  return !d || d < iso(0)
}

export const formatDate = (s) => {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

export const DASHBOARD = {
  tiles: [
    { type: 'stat', measure: 'count', label: 'Betriebsmittel', caption: 'im Bestand' },
    {
      type: 'stat',
      measure: 'count',
      filter: (r) => isOverdue(r),
      label: 'Fällig oder gesperrt',
      caption: 'sofort anfassen',
    },
    {
      type: 'stat',
      measure: 'count',
      filter: (r) => {
        const d = dueDate(r)
        return d && d >= iso(0) && d <= iso(60)
      },
      label: 'In den nächsten 60 Tagen',
      caption: 'Prüftermin planen',
    },
    { type: 'donut', groupBy: 'result' },
    { type: 'bar', groupBy: 'location', measure: 'count', label: 'Geräte je Standort' },
    { type: 'bar', groupBy: 'kind', measure: 'count', label: 'Geräte je Art' },
  ],
}

/**
 * Der Prüftag als Wizard: Gerät suchen oder anlegen, Ergebnis eintragen, fertig.
 * Der CSV-Schritt nimmt die Geräteliste auf, die fast jeder Betrieb schon als
 * Tabelle irgendwo liegen hat.
 */
export const WIZARD = {
  title: 'Prüfung eintragen',
  intro: 'Drei Schritte. Für den ersten Aufbau eines Bestands hilft der Schritt „Liste einlesen".',
  steps: [
    { id: 'geraet', label: 'Gerät', fields: ['name', 'kind', 'serial', 'location', 'holder', 'interval'] },
    { id: 'pruefung', label: 'Prüfung', fields: ['lastTest', 'tester', 'result', 'defect', 'note'] },
    {
      id: 'liste',
      label: 'Liste einlesen',
      type: 'csv',
      when: (drafts) => Boolean(drafts.records?.name),
    },
    { id: 'pruefen', label: 'Prüfen', type: 'review' },
  ],
  done: { message: 'Eingetragen. Die nächste Fälligkeit rechnet sich von selbst.', allowAnother: true },
}
