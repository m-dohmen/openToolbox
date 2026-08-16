// SPDX-License-Identifier: Apache-2.0
/**
 * EU-Verpackungsverordnung (PPWR, VO (EU) 2025/40) — Verpackungsregister.
 *
 * Der Fall: ab dem 12. August 2026 braucht jede in Verkehr gebrachte
 * Verpackung eine Konformitätserklärung und eine technische Dokumentation.
 * Für einen Konzern macht das eine Fachabteilung. Für den Manufakturbetrieb
 * mit vierzig Artikeln macht das die Inhaberin am Küchentisch — und stellt
 * fest, dass die Angaben nicht bei ihr liegen, sondern bei ihren Lieferanten.
 *
 * Genau das ist ein Erhebungsproblem und keine Softwarefrage: man muss
 * Kartonlieferant, Etikettendruckerei und Folienhersteller anschreiben und die
 * Antworten irgendwo sammeln, bis das Bild vollständig ist.
 *
 * **Zwei Datenarten**, weil die Recyclingfähigkeit nicht an der Verpackung
 * hängt, sondern an ihren Bestandteilen: Karton, Klebeband, Sichtfenster und
 * Etikett werden getrennt bewertet, und erst ihre Summe ergibt die Verpackung.
 * Ein Sichtfenster aus der falschen Folie kippt die ganze Einheit.
 *
 * Alle Werte sind erfunden. Das hier ist eine Veranschaulichung der Struktur,
 * keine Rechtsberatung und kein Nachweis von Konformität.
 */

const CATEGORIES = ['Verkaufsverpackung', 'Umverpackung', 'Transportverpackung', 'Serviceverpackung']
const MATERIALS = ['Papier/Karton', 'Kunststoff PE', 'Kunststoff PET', 'Kunststoff PP', 'Glas', 'Aluminium', 'Weißblech', 'Verbund']
const GRADES = ['A', 'B', 'C', 'D', 'E', 'noch offen']
const DOC_STATUS = ['nicht begonnen', 'beim Lieferanten angefragt', 'Angaben liegen vor', 'Erklärung erstellt']

const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

const today = () => iso(0)

export const ENTITIES = {
  packagings: {
    schema: {
      idField: 'id',
      singular: 'Verpackung',
      plural: 'Verpackungen',
      titleField: 'name',
      subField: 'category',
      list: ['name', 'category', 'articles', 'weight', 'recyclate', 'docStatus', 'deadline'],
      facets: ['category', 'docStatus'],
      search: ['id', 'name', 'articles', 'note'],
      totalField: null,
      fields: [
        { key: 'name', label: 'Verpackung', type: 'text', required: true },
        { key: 'category', label: 'Art', type: 'enum', values: CATEGORIES },
        { key: 'articles', label: 'Betroffene Artikel', short: 'Artikel', type: 'text' },
        {
          key: 'docStatus',
          label: 'Stand der Unterlagen',
          short: 'Stand',
          type: 'enum',
          values: DOC_STATUS,
        },
        { key: 'deadline', label: 'Eigene Frist', short: 'Frist', type: 'date' },
        { key: 'responsible', label: 'Zuständig', type: 'text' },
        {
          key: 'doc',
          label: 'Konformitätserklärung',
          short: 'KE',
          type: 'attachment',
        },
        { key: 'note', label: 'Notiz', type: 'text', long: true },
        /* Gewicht und Rezyklatanteil werden aus den Bestandteilen gerechnet,
           nicht getippt: sobald jemand ein Etikett wechselt, wäre eine von
           Hand gepflegte Zahl still falsch. Dass ein berechnetes Feld über
           eine Entitätsgrenze hinweg rechnet, geht, weil `compute` beim
           Rendern läuft und die Bestandteile hier im Modul stehen. */
        {
          key: 'weight',
          label: 'Gewicht gesamt (g)',
          short: 'g',
          type: 'computed',
          compute: (r) => componentsOf(r.id).reduce((sum, c) => sum + (Number(c.weight) || 0), 0),
        },
        {
          key: 'recyclate',
          label: 'Rezyklatanteil',
          short: 'Rez.',
          type: 'computed',
          compute: (r) => {
            const parts = componentsOf(r.id)
            const total = parts.reduce((s, c) => s + (Number(c.weight) || 0), 0)
            if (!total) return ''
            const share = parts.reduce(
              (s, c) => s + ((Number(c.weight) || 0) * (Number(c.recycled) || 0)) / 100,
              0,
            )
            return Math.round((share / total) * 100) + ' %'
          },
        },
        {
          key: 'worst',
          label: 'Schlechteste Klasse',
          short: 'Klasse',
          type: 'computed',
          // Eine Verpackung ist nur so gut wie ihr schwächster Bestandteil.
          compute: (r) => {
            const grades = componentsOf(r.id)
              .map((c) => c.grade)
              .filter((g) => g && g !== 'noch offen')
            if (!grades.length) return 'noch offen'
            return grades.sort().at(-1)
          },
        },
      ],
      rules: [
        {
          when: (r) => r.docStatus === 'Erklärung erstellt',
          require: ['responsible'],
          message: 'Eine ausgestellte Erklärung braucht eine verantwortliche Person.',
        },
        {
          when: (r) => r.docStatus === 'Erklärung erstellt',
          check: (r) => Boolean(r.doc?.data),
          fields: ['doc'],
          message: 'Die erstellte Erklärung gehört als Datei an den Datensatz.',
        },
      ],
    },
    uid: () => 'V-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    emptyRecord: () => ({
      id: '',
      name: '',
      category: CATEGORIES[0],
      articles: '',
      docStatus: DOC_STATUS[0],
      deadline: '2026-08-12',
      responsible: '',
      doc: null,
      note: '',
    }),
    seed: () => [
      ['V-101', 'Versandkarton 300×200×100', 'Verkaufsverpackung', 'alle Online-Bestellungen', 'Angaben liegen vor', 12, 'S. Behrens'],
      ['V-102', 'Standbodenbeutel 250 g', 'Verkaufsverpackung', 'Kaffee gemahlen, Kaffee ganze Bohne', 'beim Lieferanten angefragt', -4, 'S. Behrens'],
      ['V-103', 'Glasflasche 500 ml mit Bügelverschluss', 'Verkaufsverpackung', 'Sirup Holunder, Sirup Ingwer', 'Erklärung erstellt', -30, 'M. Voss'],
      ['V-104', 'Geschenkkarton Weihnachten', 'Umverpackung', 'Saisonsortiment', 'nicht begonnen', 40, ''],
      ['V-105', 'Palettensicherung Stretchfolie', 'Transportverpackung', 'Großhandelslieferungen', 'beim Lieferanten angefragt', 3, 'M. Voss'],
      ['V-106', 'Papiertragetasche Ladengeschäft', 'Serviceverpackung', 'Ladenverkauf', 'Angaben liegen vor', 25, 'K. Lorenz'],
      ['V-107', 'Kartonage Probierset', 'Verkaufsverpackung', 'Probierset 4×100 g', 'nicht begonnen', -1, ''],
      ['V-108', 'Versandtasche gepolstert', 'Verkaufsverpackung', 'Kleinbestellungen', 'Angaben liegen vor', 18, 'K. Lorenz'],
    ].map(([id, name, category, articles, docStatus, days, responsible]) => ({
      id,
      name,
      category,
      articles,
      docStatus,
      deadline: iso(days),
      responsible,
      doc: null,
      note: '',
    })),
    isDone: (r) => r.docStatus === 'Erklärung erstellt',
    isOverdue: (r) => r.docStatus !== 'Erklärung erstellt' && r.deadline && r.deadline < today(),
  },

  components: {
    schema: {
      idField: 'id',
      singular: 'Bestandteil',
      plural: 'Bestandteile',
      titleField: 'name',
      subField: null,
      list: ['name', 'packagingId', 'material', 'weight', 'recycled', 'grade', 'source'],
      facets: ['material', 'grade'],
      search: ['id', 'name', 'supplier'],
      totalField: 'weight',
      fields: [
        { key: 'name', label: 'Bestandteil', type: 'text', required: true },
        {
          key: 'packagingId',
          label: 'Gehört zu',
          short: 'Verpackung',
          type: 'reference',
          entity: 'packagings',
          required: true,
        },
        { key: 'material', label: 'Material', type: 'enum', values: MATERIALS },
        { key: 'weight', label: 'Gewicht (g)', short: 'g', type: 'number' },
        { key: 'recycled', label: 'Rezyklatanteil (%)', short: '% Rez.', type: 'number' },
        { key: 'grade', label: 'Recyclingklasse', short: 'Klasse', type: 'enum', values: GRADES },
        {
          key: 'source',
          label: 'Angabe von',
          short: 'Quelle',
          type: 'enum',
          values: ['Lieferant schriftlich', 'Datenblatt', 'selbst geschätzt', 'fehlt noch'],
        },
        { key: 'supplier', label: 'Lieferant', type: 'text' },
        { key: 'note', label: 'Notiz', type: 'text', long: true },
      ],
      rules: [
        {
          /* Der eigentliche Schmerz dieses Prozesses: eine Schätzung sieht in
             der Tabelle aus wie eine belastbare Angabe. Die Regel zwingt dazu,
             die Herkunft zu benennen, bevor eine Zahl darin steht. */
          when: (r) => Number(r.recycled) > 0,
          require: ['source'],
          message: 'Zu einem Rezyklatanteil gehört, woher die Zahl stammt.',
        },
        {
          when: (r) => r.source === 'Lieferant schriftlich',
          require: ['supplier'],
          message: 'Wenn der Lieferant es schriftlich bestätigt hat, gehört sein Name dazu.',
        },
      ],
    },
    uid: () => 'B-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    emptyRecord: () => ({
      id: '',
      name: '',
      packagingId: '',
      material: MATERIALS[0],
      weight: 0,
      recycled: 0,
      grade: 'noch offen',
      source: 'fehlt noch',
      supplier: '',
      note: '',
    }),
    seed: () =>
      [
        ['B-201', 'Wellpappe-Zuschnitt', 'V-101', 'Papier/Karton', 210, 80, 'A', 'Lieferant schriftlich', 'Wellpappe Nord GmbH'],
        ['B-202', 'Papierklebeband', 'V-101', 'Papier/Karton', 6, 45, 'A', 'Datenblatt', 'Wellpappe Nord GmbH'],
        ['B-203', 'Versandetikett', 'V-101', 'Papier/Karton', 2, 0, 'B', 'selbst geschätzt', ''],
        ['B-204', 'Beutelfolie', 'V-102', 'Verbund', 9, 0, 'E', 'fehlt noch', 'Folienwerk Süd'],
        ['B-205', 'Aromaventil', 'V-102', 'Kunststoff PE', 1, 0, 'noch offen', 'fehlt noch', 'Folienwerk Süd'],
        ['B-206', 'Etikett Vorderseite', 'V-102', 'Papier/Karton', 2, 30, 'B', 'Datenblatt', 'Druckerei Ahrens'],
        ['B-207', 'Flaschenkörper', 'V-103', 'Glas', 380, 62, 'A', 'Lieferant schriftlich', 'Glashütte Rheinbach'],
        ['B-208', 'Bügelverschluss', 'V-103', 'Weißblech', 14, 0, 'C', 'Datenblatt', 'Glashütte Rheinbach'],
        ['B-209', 'Dichtung', 'V-103', 'Kunststoff PE', 2, 0, 'D', 'selbst geschätzt', ''],
        ['B-210', 'Faltkarton bedruckt', 'V-104', 'Papier/Karton', 145, 0, 'noch offen', 'fehlt noch', ''],
        ['B-211', 'Sichtfenster', 'V-104', 'Kunststoff PET', 4, 0, 'D', 'selbst geschätzt', ''],
        ['B-212', 'Stretchfolie', 'V-105', 'Kunststoff PE', 320, 30, 'B', 'Datenblatt', 'Folienwerk Süd'],
        ['B-213', 'Papiertasche', 'V-106', 'Papier/Karton', 38, 85, 'A', 'Lieferant schriftlich', 'Papier Krüger KG'],
        ['B-214', 'Kordelgriff', 'V-106', 'Papier/Karton', 3, 0, 'B', 'Datenblatt', 'Papier Krüger KG'],
        ['B-215', 'Polstertasche', 'V-108', 'Papier/Karton', 24, 70, 'A', 'Lieferant schriftlich', 'Papier Krüger KG'],
      ].map(([id, name, packagingId, material, weight, recycled, grade, source, supplier]) => ({
        id,
        name,
        packagingId,
        material,
        weight,
        recycled,
        grade,
        source,
        supplier,
        note: '',
      })),
    isDone: () => false,
    isOverdue: (r) => r.source === 'fehlt noch',
  },
}

/* Die Bestandteile einer Verpackung. Steht hier und nicht im Schema, damit die
   berechneten Felder oben darauf zugreifen können - `compute` bekommt nur den
   eigenen Datensatz, nicht den Gesamtbestand. Gerechnet wird auf den
   Seed-Daten; in einem echten Werkzeug würde man die Aufteilung anders lösen
   oder die Summe in der Dashboard-Kachel bilden. */
const componentsOf = (packagingId) =>
  ENTITIES.components.seed().filter((c) => c.packagingId === packagingId)

export const formatDate = (s) => {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

export const DASHBOARD = {
  tiles: [
    { type: 'stat', entity: 'packagings', measure: 'count', label: 'Verpackungen', caption: 'im Register' },
    {
      type: 'stat',
      entity: 'packagings',
      measure: 'count',
      filter: (r) => r.docStatus !== 'Erklärung erstellt',
      label: 'Noch offen',
      caption: 'ohne fertige Erklärung',
    },
    {
      type: 'stat',
      entity: 'components',
      measure: 'count',
      filter: (r) => r.source === 'fehlt noch',
      label: 'Angaben fehlen',
      caption: 'Bestandteile ohne Quelle',
    },
    { type: 'donut', entity: 'packagings', groupBy: 'docStatus' },
    { type: 'bar', entity: 'components', groupBy: 'material', measure: 'weight', label: 'Gewicht je Material (g)' },
    { type: 'bar', entity: 'components', groupBy: 'grade', measure: 'count', label: 'Bestandteile je Recyclingklasse' },
  ],
}

/**
 * Der Erhebungsweg als Wizard: eine Verpackung anlegen und gleich ihren ersten
 * Bestandteil dazu. Der CSV-Schritt ist der eigentliche Zeitgewinn - was der
 * Lieferant als Tabelle schickt, muss niemand abtippen.
 */
export const WIZARD = {
  title: 'Verpackung aufnehmen',
  intro:
    'Erst die Verpackung, dann ihre Bestandteile. Geschrieben wird nichts, bevor der letzte ' +
    'Schritt bestätigt ist — Abbrechen hinterlässt nichts.',
  steps: [
    {
      id: 'verpackung',
      label: 'Verpackung',
      entity: 'packagings',
      fields: ['name', 'category', 'articles', 'responsible', 'deadline'],
    },
    {
      id: 'bestandteil',
      label: 'Erster Bestandteil',
      entity: 'components',
      fields: ['name', 'packagingId', 'material', 'weight', 'recycled', 'grade', 'source', 'supplier'],
      when: (drafts) => Boolean(drafts.packagings?.name),
    },
    {
      id: 'liste',
      label: 'Liste vom Lieferanten',
      entity: 'components',
      type: 'csv',
      when: (drafts) => Boolean(drafts.packagings?.name),
    },
    { id: 'pruefen', label: 'Prüfen', type: 'review' },
  ],
  done: {
    message: 'Aufgenommen. Was noch fehlt, steht in der Liste unter „Angabe von: fehlt noch".',
    allowAnother: true,
  },
}
