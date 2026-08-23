// SPDX-License-Identifier: Apache-2.0
/**
 * Verzeichnis von Verarbeitungstätigkeiten (DSGVO Art. 30).
 *
 * Der Fall: jedes Unternehmen ab einer gewissen Größe muss eines führen, und
 * fast keines führt eines, das den Namen verdient. Der Grund ist selten Unwille
 * — es ist die Erhebung. Die Angaben liegen bei zwölf verschiedenen Leuten, die
 * Bewerbungsmappen bei der Personalstelle, das Newsletter-Tool im Marketing,
 * die Videoanlage beim Hausmeister. Wer das zentral ausfüllen will, schreibt
 * zwölf Mails und bekommt neun Antworten.
 *
 * Deshalb ist diese Demo im **Erfassungsmodus** ausgeliefert: die Datei geht an
 * die Fachbereiche, jeder meldet seine Verarbeitung im Wizard, schickt zurück,
 * und die Kopien werden über *Datei abgleichen* zusammengeführt. Genau der
 * Ablauf, für den es sonst ein Formular in einem Portal bräuchte.
 *
 * Bewusst ohne Zahlen: dieses Verzeichnis besteht fast vollständig aus
 * Auswahlwerten und Freitext. Ein Werkzeug muss nicht rechnen, um zu helfen.
 *
 * Alle Einträge sind erfunden. Veranschaulichung der Struktur, keine
 * Rechtsberatung.
 */

const AREAS = ['Personal', 'Vertrieb', 'Marketing', 'IT', 'Buchhaltung', 'Empfang']
const BASIS = [
  'Vertrag (Art. 6 I b)',
  'Rechtliche Pflicht (Art. 6 I c)',
  'Berechtigtes Interesse (Art. 6 I f)',
  'Einwilligung (Art. 6 I a)',
  'noch zu klären',
]
const SUBJECTS = ['Beschäftigte', 'Bewerberinnen und Bewerber', 'Kundinnen und Kunden', 'Interessenten', 'Lieferanten', 'Besucher']
const RISK = ['gering', 'mittel', 'hoch']
const STATUS = ['gemeldet', 'in Prüfung', 'freigegeben', 'nachzubessern']

const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export const SCHEMA = {
  idField: 'id',
  singular: 'Verarbeitung',
  plural: 'Verarbeitungen',
  titleField: 'name',
  subField: 'area',
  list: ['name', 'area', 'basis', 'subjects', 'retention', 'age', 'status'],
  facets: ['area', 'status', 'risk'],
  totalField: null,
  fields: [
    { key: 'name', label: 'Verarbeitungstätigkeit', type: 'text', required: true },
    { key: 'area', label: 'Bereich', type: 'enum', values: AREAS },
    { key: 'contact', label: 'Ansprechperson', short: 'Kontakt', type: 'text' },
    { key: 'purpose', label: 'Zweck der Verarbeitung', short: 'Zweck', type: 'text', long: true },
    { key: 'subjects', label: 'Betroffene', type: 'enum', values: SUBJECTS },
    { key: 'categories', label: 'Datenkategorien', short: 'Daten', type: 'text', long: true },
    { key: 'basis', label: 'Rechtsgrundlage', short: 'Grundlage', type: 'enum', values: BASIS },
    { key: 'system', label: 'System / Ablage', short: 'System', type: 'text' },
    { key: 'processor', label: 'Auftragsverarbeiter', short: 'AV', type: 'text' },
    { key: 'thirdCountry', label: 'Drittlandtransfer', short: 'Drittland', type: 'enum', values: ['nein', 'ja', 'unklar'] },
    { key: 'retention', label: 'Löschfrist', short: 'Frist', type: 'text' },
    { key: 'risk', label: 'Risiko', type: 'enum', values: RISK },
    { key: 'status', label: 'Status', type: 'enum', values: STATUS },
    { key: 'reviewed', label: 'Zuletzt geprüft', short: 'Geprüft', type: 'date' },
    { key: 'note', label: 'Notiz', type: 'text', long: true },
    /* Ein Verzeichnis veraltet lautlos. Die Spalte macht sichtbar, was seit
       der letzten Prüfung liegen geblieben ist - ohne dass jemand rechnet. */
    {
      key: 'age',
      label: 'Tage seit Prüfung',
      short: 'Alter',
      type: 'computed',
      compute: (r) => {
        if (!r.reviewed) return ''
        return Math.round((new Date().setHours(0, 0, 0, 0) - new Date(r.reviewed)) / 86400000)
      },
    },
  ],
  rules: [
    {
      when: (r) => r.basis === 'Einwilligung (Art. 6 I a)',
      require: ['note'],
      message: 'Bei einer Einwilligung gehört in die Notiz, wie und wo sie eingeholt wird.',
    },
    {
      when: (r) => r.thirdCountry === 'ja',
      require: ['processor'],
      message: 'Bei einem Drittlandtransfer muss stehen, wer dort verarbeitet.',
    },
    {
      when: (r) => r.status === 'freigegeben',
      require: ['purpose', 'categories', 'retention', 'reviewed'],
      message: 'Freigeben lässt sich nur, was Zweck, Datenkategorien, Löschfrist und Prüfdatum hat.',
    },
    {
      when: (r) => r.risk === 'hoch',
      require: ['note'],
      message: 'Ein hohes Risiko braucht eine Begründung — es kann eine Folgenabschätzung auslösen.',
    },
  ],
}

export const uid = () => 'VT-' + Math.random().toString(36).slice(2, 6).toUpperCase()

export const emptyRecord = () => ({
  id: '',
  name: '',
  area: AREAS[0],
  contact: '',
  purpose: '',
  subjects: SUBJECTS[0],
  categories: '',
  basis: 'noch zu klären',
  system: '',
  processor: '',
  thirdCountry: 'nein',
  retention: '',
  risk: 'gering',
  status: 'gemeldet',
  reviewed: '',
  note: '',
})

export const seed = () =>
  [
    ['VT-001', 'Personalakten', 'Personal', 'A. Reinke', 'Durchführung des Arbeitsverhältnisses', 'Beschäftigte', 'Stammdaten, Vertrag, Zeugnisse, Fehlzeiten', 'Vertrag (Art. 6 I b)', 'Aktenschrank + Lohnprogramm', '', 'nein', '10 Jahre nach Austritt', 'mittel', 'freigegeben', -95, ''],
    ['VT-002', 'Bewerbungsverfahren', 'Personal', 'A. Reinke', 'Auswahl von Bewerberinnen und Bewerbern', 'Bewerberinnen und Bewerber', 'Anschreiben, Lebenslauf, Zeugnisse', 'Vertrag (Art. 6 I b)', 'Mailpostfach bewerbung@', '', 'nein', '6 Monate nach Absage', 'mittel', 'nachzubessern', -230, 'Löschung läuft bisher von Hand.'],
    ['VT-003', 'Newsletter-Versand', 'Marketing', 'K. Lorenz', 'Information über neue Produkte', 'Interessenten', 'E-Mail-Adresse, Anrede, Öffnungsverhalten', 'Einwilligung (Art. 6 I a)', 'Newsletter-Dienst', 'Mailanbieter (US)', 'ja', 'bis Widerruf', 'mittel', 'in Prüfung', -12, 'Double-Opt-in über das Anmeldeformular auf der Website.'],
    ['VT-004', 'Kundenstammdaten', 'Vertrieb', 'M. Voss', 'Angebot, Auftrag, Rechnung', 'Kundinnen und Kunden', 'Firmierung, Ansprechpartner, Kontaktdaten', 'Vertrag (Art. 6 I b)', 'Warenwirtschaft', '', 'nein', '10 Jahre (HGB/AO)', 'gering', 'freigegeben', -40, ''],
    ['VT-005', 'Videoüberwachung Lager', 'IT', 'T. Krüger', 'Schutz vor Einbruch und Diebstahl', 'Besucher', 'Bildaufnahmen', 'Berechtigtes Interesse (Art. 6 I f)', 'Rekorder im Serverraum', '', 'nein', '72 Stunden', 'hoch', 'nachzubessern', -310, 'Interessenabwägung liegt nicht schriftlich vor. Hinweisschilder prüfen.'],
    ['VT-006', 'Buchhaltung und Belegablage', 'Buchhaltung', 'D. Ahrens', 'Erfüllung steuerlicher Pflichten', 'Lieferanten', 'Rechnungsdaten, Bankverbindung', 'Rechtliche Pflicht (Art. 6 I c)', 'Buchhaltungssoftware', 'Steuerkanzlei', 'nein', '10 Jahre', 'gering', 'freigegeben', -60, ''],
    ['VT-007', 'Besucherbuch Empfang', 'Empfang', '', 'Nachvollziehbarkeit von Zutritten', 'Besucher', 'Name, Firma, Uhrzeit, besuchte Person', 'Berechtigtes Interesse (Art. 6 I f)', 'Kladde am Empfang', '', 'nein', '', 'gering', 'gemeldet', 0, ''],
    ['VT-008', 'Zeiterfassung', 'Personal', 'A. Reinke', 'Erfassung der Arbeitszeit', 'Beschäftigte', 'Kommen/Gehen, Pausen, Urlaub', 'Rechtliche Pflicht (Art. 6 I c)', 'Zeiterfassungsterminal', 'Hersteller (Wartung)', 'nein', '2 Jahre', 'mittel', 'in Prüfung', -18, ''],
    ['VT-009', 'Support-Postfach', 'IT', 'T. Krüger', 'Bearbeitung von Störungsmeldungen', 'Kundinnen und Kunden', 'Kontaktdaten, Inhalt der Anfrage', 'Vertrag (Art. 6 I b)', 'Ticketsystem', 'Hoster', 'unklar', '3 Jahre', 'mittel', 'gemeldet', -5, ''],
    ['VT-010', 'Kundenzufriedenheitsbefragung', 'Marketing', 'K. Lorenz', 'Verbesserung der Leistungen', 'Kundinnen und Kunden', 'E-Mail-Adresse, Antworten', 'Einwilligung (Art. 6 I a)', 'Umfragedienst', 'Umfrageanbieter (EU)', 'nein', '1 Jahr', 'gering', 'in Prüfung', -22, 'Einwilligung im Einladungsmailing, Abmeldung in jeder Mail.'],
  ].map(([id, name, area, contact, purpose, subjects, categories, basis, system, processor, thirdCountry, retention, risk, status, days, note]) => ({
    id,
    name,
    area,
    contact,
    purpose,
    subjects,
    categories,
    basis,
    system,
    processor,
    thirdCountry,
    retention,
    risk,
    status,
    reviewed: days ? iso(days) : '',
    note,
  }))

export const isDone = (r) => r.status === 'freigegeben'

/* Ein Eintrag gilt als überfällig, wenn er nie oder seit über einem Jahr nicht
   geprüft wurde. Genau das ist der Zustand, in dem sich die meisten
   Verzeichnisse befinden - und den niemand sieht, solange nichts rot wird. */
export const isOverdue = (r) => !r.reviewed || r.reviewed < iso(-365)

export const formatDate = (s) => {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

export const DASHBOARD = {
  tiles: [
    { type: 'stat', measure: 'count', label: 'Verarbeitungen', caption: 'im Verzeichnis' },
    {
      type: 'stat',
      measure: 'count',
      filter: (r) => isOverdue(r),
      label: 'Prüfung überfällig',
      caption: 'nie oder vor über einem Jahr',
    },
    {
      type: 'stat',
      measure: 'count',
      filter: (r) => r.basis === 'noch zu klären' || r.thirdCountry === 'unklar',
      label: 'Offene Fragen',
      caption: 'Rechtsgrundlage oder Drittland unklar',
    },
    { type: 'donut', groupBy: 'status' },
    { type: 'bar', groupBy: 'area', measure: 'count', label: 'Verarbeitungen je Bereich' },
    { type: 'bar', groupBy: 'risk', measure: 'count', label: 'Verteilung nach Risiko' },
  ],
}

/**
 * Der Wizard ist hier die Hauptsache, nicht die Beigabe: die Datei geht an die
 * Fachbereiche, jeder meldet seine eigene Verarbeitung. Deshalb ist diese Demo
 * mit `mode: 'intake'` gebaut — sie öffnet direkt hier und zeigt die Liste
 * gar nicht erst.
 */
export const WIZARD = {
  title: 'Eine Verarbeitung melden',
  intro:
    'Fünf kurze Schritte. Wenn Sie etwas nicht wissen, lassen Sie es leer — ein unvollständiger ' +
    'Eintrag ist besser als keiner. Gespeichert wird erst am Ende.',
  steps: [
    { id: 'was', label: 'Was und wer', fields: ['name', 'area', 'contact'] },
    { id: 'zweck', label: 'Zweck und Daten', fields: ['purpose', 'subjects', 'categories'] },
    { id: 'grundlage', label: 'Rechtsgrundlage', fields: ['basis', 'note'] },
    {
      id: 'technik',
      label: 'Wo liegt es',
      fields: ['system', 'processor', 'thirdCountry', 'retention'],
    },
    {
      id: 'risiko',
      label: 'Risiko',
      fields: ['risk'],
      // Nur fragen, wenn es plausibel heikel wird - sonst kreuzt jeder "gering" an.
      when: (drafts) =>
        drafts.records?.subjects === 'Beschäftigte' ||
        drafts.records?.subjects === 'Bewerberinnen und Bewerber' ||
        drafts.records?.thirdCountry === 'ja',
    },
    { id: 'pruefen', label: 'Prüfen', type: 'review' },
  ],
  done: {
    message: 'Danke — das ist aufgenommen. Bitte die Datei speichern und zurücksenden.',
    allowAnother: true,
  },
}
