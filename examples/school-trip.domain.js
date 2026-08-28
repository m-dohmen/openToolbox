// SPDX-License-Identifier: Apache-2.0
/**
 * Klassenfahrt: Rückläufer von Eltern.
 *
 * Der Fall, den fast jeder kennt: 28 Zettel gehen raus, 19 kommen zurück, drei
 * ohne Unterschrift, einer mit einer Allergie auf der Rückseite, und zwei Tage
 * vor Abfahrt fehlt immer noch das Geld von vier Familien. Die Klassenlehrerin
 * führt das in einer Tabelle, die sie nicht teilen darf, weil Allergien und
 * Schwimmfähigkeit darin stehen.
 *
 * Diese Domäne ist die menschlichste der Beispiele und zeigt zwei Dinge, die in
 * den anderen nicht vorkommen: **eine Datei, die verschlüsselt gehört** — hier
 * stehen Gesundheitsangaben von Kindern drin — und einen Bestand, der fast nur
 * aus Ja/Nein-Zuständen besteht. Nichts wird gerechnet außer dem, was fehlt.
 *
 * Alle Namen und Angaben sind erfunden.
 */

const CONSENT = ['ausstehend', 'liegt vor', 'verweigert']
const PAYMENT = ['offen', 'teilweise', 'vollständig', 'Zuschuss beantragt', 'erlassen']
const SWIM = ['ja', 'nein', 'unbekannt']

const FEE = 185

export const SCHEMA = {
  idField: 'id',
  singular: 'Kind',
  plural: 'Kinder',
  titleField: 'name',
  subField: 'guardian',
  list: ['name', 'guardian', 'consent', 'payment', 'paid', 'open', 'swim'],
  facets: ['consent', 'payment', 'swim'],
  totalField: 'paid',
  /**
   * Drei Sichten, die im Dropdown am Listenkopf stehen. Sie decken den
   * typischen Wochenrhythmus ab: morgens „was fehlt an Zetteln?", vor der
   * nächsten Überweisung „welche Kinder haben noch nicht gezahlt?", und
   * gelegentlich eine vollständige Durchsicht in alphabetischer Reihenfolge.
   *
   * Jede Sicht hier ist ein Vorschlag des Werkzeugbauers. Was die
   * Klassenlehrerin daraus macht (umbenennen, ergänzen, eigene anlegen),
   * wird in den Einstellungen daneben gespeichert und reist mit der Datei
   * mit. Ein Beispiel für eine selbst angelegte Sicht entsteht, sobald sie
   * im Editor auf „Aktuelle als Sicht speichern" klickt — das ist die
   * zweite Hälfte des Features.
   */
  views: [
    {
      name: 'Alle',
      query: '',
      filters: {},
      sort: { key: 'name', dir: 1 },
    },
    {
      name: 'Zettel ausstehend',
      query: '',
      filters: { consent: { v: 'ausstehend' } },
      sort: { key: 'name', dir: 1 },
    },
    {
      name: 'Geld offen',
      query: '',
      filters: { payment: { v: 'offen' } },
      sort: { key: 'open', dir: -1 },
    },
  ],
  /**
   * Optionale Kanban-Sicht. Schaltet den Reiter „Board" neben „Liste" und
   * „Dashboard" frei — Spalten folgen dem Einverständnis (ausstehend → liegt
   * vor → verweigert). Wer morgens durch die Spalten zieht, sieht sofort, bei
   * wem noch ein Zettel fehlt; ein Drag nach „liegt vor" trägt sich wie eine
   * Formular-Änderung ins Änderungsprotokoll ein.
   *
   * Drei Kartenfelder reichen: wer unterschrieben hat (guardian), wie man
   * diese Person erreicht (phone) und wo das Geld steht (payment). Schwimmen
   * und Allergie sind hier zweitrangig — sie stehen in der Karten-Detailseite
   * und in der Tabelle, ohne den Board zu überladen.
   */
  view: {
    board: {
      columnField: 'consent',
      cardFields: ['guardian', 'phone', 'payment'],
    },
  },
  fields: [
    { key: 'name', label: 'Kind', type: 'text', required: true },
    { key: 'guardian', label: 'Erziehungsberechtigte', short: 'Eltern', type: 'text' },
    { key: 'phone', label: 'Telefon für Notfälle', short: 'Telefon', type: 'text' },
    { key: 'consent', label: 'Einverständnis', short: 'Einv.', type: 'enum', values: CONSENT },
    { key: 'consentForm', label: 'Unterschriebener Zettel', short: 'Zettel', type: 'attachment' },
    { key: 'payment', label: 'Zahlung', type: 'enum', values: PAYMENT },
    { key: 'paid', label: 'Bezahlt (€)', short: '€', type: 'number' },
    { key: 'swim', label: 'Schwimmabzeichen', short: 'Schwimmen', type: 'enum', values: SWIM },
    { key: 'diet', label: 'Essen (Allergien, vegetarisch …)', short: 'Essen', type: 'text' },
    { key: 'medical', label: 'Medizinisches', short: 'Medizin', type: 'text', long: true },
    { key: 'roomWish', label: 'Zimmerwunsch', short: 'Zimmer', type: 'text' },
    { key: 'note', label: 'Notiz', type: 'text', long: true },
    {
      key: 'open',
      label: 'Noch offen (€)',
      short: 'Offen',
      type: 'computed',
      compute: (r) => {
        if (r.payment === 'erlassen') return 0
        return Math.max(0, FEE - (Number(r.paid) || 0))
      },
    },
  ],
  rules: [
    {
      when: (r) => r.consent === 'liegt vor',
      require: ['guardian', 'phone'],
      message: 'Zum Einverständnis gehört, wer unterschrieben hat und wie man diese Person erreicht.',
    },
    {
      when: (r) => r.payment === 'vollständig',
      check: (r) => Number(r.paid) >= FEE,
      fields: ['paid'],
      message: `Vollständig heißt ${FEE} € — sonst stimmt die Kassenaufstellung nicht.`,
    },
    {
      when: (r) => r.payment === 'erlassen',
      require: ['note'],
      message: 'Ein Erlass gehört begründet — die Kasse wird geprüft.',
    },
    {
      /* Der Grund, aus dem diese Datei verschlüsselt gehört: hier steht
         Gesundheitliches. Die Regel erzwingt wenigstens, dass es vollständig
         ist, wenn es überhaupt erfasst wird. */
      when: (r) => Boolean(r.medical?.trim()),
      require: ['phone'],
      message: 'Wo Medizinisches steht, muss eine Telefonnummer daneben stehen.',
    },
  ],
}

export const uid = () => 'K-' + Math.random().toString(36).slice(2, 6).toUpperCase()

export const emptyRecord = () => ({
  id: '',
  name: '',
  guardian: '',
  phone: '',
  consent: 'ausstehend',
  consentForm: null,
  payment: 'offen',
  paid: 0,
  swim: 'unbekannt',
  diet: '',
  medical: '',
  roomWish: '',
  note: '',
})

export const seed = () =>
  [
    ['K-01', 'Amelie B.', 'Fam. Brandt', '0170 1234567', 'liegt vor', 'vollständig', 185, 'ja', 'vegetarisch', '', 'mit Jara'],
    ['K-02', 'Ben H.', 'Fam. Hoffmann', '0171 2345678', 'liegt vor', 'vollständig', 185, 'ja', '', '', ''],
    ['K-03', 'Carla M.', 'Fam. Mertens', '0151 3456789', 'liegt vor', 'teilweise', 90, 'ja', 'Nussallergie', 'Notfallset im Rucksack, Handhabung mit Frau Reinke besprochen', ''],
    ['K-04', 'David S.', 'Fam. Schuster', '', 'ausstehend', 'offen', 0, 'unbekannt', '', '', ''],
    ['K-05', 'Elif K.', 'Fam. Kaya', '0160 4567890', 'liegt vor', 'vollständig', 185, 'nein', 'kein Schweinefleisch', '', 'mit Amelie'],
    ['K-06', 'Finn R.', 'Fam. Roth', '0152 5678901', 'liegt vor', 'Zuschuss beantragt', 0, 'ja', '', '', 'Antrag beim Förderverein läuft.'],
    ['K-07', 'Greta W.', 'Fam. Winkler', '0176 6789012', 'liegt vor', 'vollständig', 185, 'ja', '', 'Asthmaspray, nimmt sie selbst', ''],
    ['K-08', 'Hannes P.', 'Fam. Pohl', '', 'ausstehend', 'offen', 0, 'unbekannt', '', '', 'Zettel zum zweiten Mal mitgegeben.'],
    ['K-09', 'Ida T.', 'Fam. Thiel', '0157 7890123', 'liegt vor', 'vollständig', 185, 'ja', 'vegan', '', ''],
    ['K-10', 'Jara L.', 'Fam. Lange', '0163 8901234', 'liegt vor', 'teilweise', 100, 'ja', '', '', 'mit Amelie'],
    ['K-11', 'Karim A.', 'Fam. Ali', '0155 9012345', 'liegt vor', 'vollständig', 185, 'ja', '', '', ''],
    ['K-12', 'Lena F.', 'Fam. Fischer', '0159 0123456', 'verweigert', 'erlassen', 0, 'ja', '', '', 'Eltern möchten nicht, dass Lena mitfährt. Betreuung in der Parallelklasse geklärt.'],
    ['K-13', 'Mats D.', 'Fam. Diehl', '0172 1122334', 'liegt vor', 'vollständig', 185, 'nein', '', '', ''],
    ['K-14', 'Nora V.', 'Fam. Vogt', '0173 2233445', 'ausstehend', 'teilweise', 50, 'ja', 'Laktose', '', 'Geld da, Zettel fehlt.'],
  ].map(([id, name, guardian, phone, consent, payment, paid, swim, diet, medical, note]) => ({
    id,
    name,
    guardian,
    phone,
    consent,
    consentForm: null,
    payment,
    paid,
    swim,
    diet,
    medical,
    roomWish: '',
    note,
  }))

/** Fertig ist ein Kind, wenn Zettel und Geld da sind — oder es nicht mitfährt. */
export const isDone = (r) =>
  r.consent === 'verweigert' ||
  (r.consent === 'liegt vor' && (r.payment === 'vollständig' || r.payment === 'erlassen'))

export const isOverdue = (r) => !isDone(r)

export const formatDate = (s) => {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

export const DASHBOARD = {
  tiles: [
    { type: 'stat', measure: 'count', label: 'Kinder', caption: 'in der Klasse' },
    {
      type: 'stat',
      measure: 'count',
      filter: (r) => !isDone(r),
      label: 'Noch offen',
      caption: 'Zettel oder Geld fehlt',
    },
    { type: 'stat', measure: 'paid', label: 'Eingegangen', caption: `€ von ${14 * FEE} €` },
    { type: 'donut', groupBy: 'payment' },
    { type: 'bar', groupBy: 'consent', measure: 'count', label: 'Einverständnisse' },
    { type: 'bar', groupBy: 'swim', measure: 'count', label: 'Schwimmabzeichen' },
  ],
}

/**
 * Der Wizard ist hier für den Elternabend gedacht: ein Kind nach dem anderen
 * aufnehmen, ohne die Tabelle zu erklären. `allowAnother` bleibt an, weil man
 * genau das mehrfach hintereinander tut.
 */
export const WIZARD = {
  title: 'Rückläufer aufnehmen',
  intro:
    'Ein Kind nach dem anderen. Was noch fehlt, einfach leer lassen — die Übersicht zeigt es ' +
    'nachher von selbst an.',
  steps: [
    { id: 'kind', label: 'Kind', fields: ['name', 'guardian', 'phone'] },
    { id: 'zettel', label: 'Zettel und Geld', fields: ['consent', 'payment', 'paid'] },
    {
      id: 'besonderes',
      label: 'Besonderheiten',
      fields: ['swim', 'diet', 'medical', 'roomWish'],
      // Wer nicht mitfährt, braucht keine Zimmerfrage.
      when: (drafts) => drafts.records?.consent !== 'verweigert',
    },
    { id: 'liste', label: 'Klassenliste einlesen', type: 'csv' },
    { id: 'pruefen', label: 'Prüfen', type: 'review' },
  ],
  done: { message: 'Aufgenommen. Nicht vergessen: Datei speichern.', allowAnother: true },
}
