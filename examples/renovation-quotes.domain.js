// SPDX-License-Identifier: Apache-2.0
/**
 * Sanierung eines Hauses: Gewerke und Angebote.
 *
 * Der Fall ist privat und trotzdem exakt derselbe wie im Projektgeschäft: für
 * jedes Gewerk holt man drei Angebote ein, eines kommt nie, eines ist doppelt
 * so teuer wie gedacht, und drei Monate später weiß niemand mehr, warum man
 * sich für den mittleren entschieden hat. Am Ende steht die Frage, die jeder
 * Bauherr zu spät stellt: *sind wir noch im Budget?*
 *
 * **Zwei Datenarten**, weil ein Angebot ohne sein Gewerk keine Aussage hat und
 * ein Gewerk erst durch seine Angebote eine Zahl bekommt. Diese Domäne ist die
 * geldgetriebene unter den Beispielen: Budget, Angebotssumme, Schlussrechnung,
 * Abweichung — alles gerechnet, nichts doppelt gepflegt.
 *
 * Alle Zahlen sind erfunden.
 */

const TRADES = ['Rohbau', 'Dach', 'Fenster', 'Elektro', 'Sanitär/Heizung', 'Estrich', 'Trockenbau', 'Maler', 'Boden', 'Außenanlage']
const PHASES = ['noch nicht angefragt', 'Angebote eingeholt', 'beauftragt', 'in Ausführung', 'abgenommen']
const OFFER_STATE = ['angefragt', 'liegt vor', 'nachverhandelt', 'abgelehnt', 'beauftragt']

const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export const ENTITIES = {
  trades: {
    schema: {
      idField: 'id',
      singular: 'Gewerk',
      plural: 'Gewerke',
      titleField: 'name',
      subField: 'trade',
      list: ['name', 'trade', 'phase', 'budget', 'awarded', 'variance', 'start'],
      facets: ['trade', 'phase'],
      totalField: 'budget',
      fields: [
        { key: 'name', label: 'Gewerk', type: 'text', required: true },
        { key: 'trade', label: 'Kategorie', type: 'enum', values: TRADES },
        { key: 'phase', label: 'Stand', type: 'enum', values: PHASES },
        { key: 'budget', label: 'Budget (€)', short: 'Budget', type: 'number' },
        { key: 'final', label: 'Schlussrechnung (€)', short: 'Schluss', type: 'number' },
        { key: 'start', label: 'Geplanter Beginn', short: 'Beginn', type: 'date' },
        { key: 'end', label: 'Geplantes Ende', short: 'Ende', type: 'date' },
        { key: 'note', label: 'Notiz', type: 'text', long: true },
        {
          key: 'awarded',
          label: 'Beauftragt (€)',
          short: 'Auftrag',
          type: 'computed',
          // Die Auftragssumme steht nicht am Gewerk, sondern im beauftragten
          // Angebot. Hier abzuschreiben hiesse, sie zweimal zu pflegen.
          compute: (r) => offersOf(r.id).filter((o) => o.state === 'beauftragt').reduce((s, o) => s + (Number(o.amount) || 0), 0),
        },
        {
          key: 'variance',
          label: 'Abweichung zum Budget (€)',
          short: '± €',
          type: 'computed',
          compute: (r) => {
            const awarded = offersOf(r.id)
              .filter((o) => o.state === 'beauftragt')
              .reduce((s, o) => s + (Number(o.amount) || 0), 0)
            const actual = Number(r.final) || awarded
            if (!actual) return ''
            return (Number(r.budget) || 0) - actual
          },
        },
        {
          key: 'offerCount',
          label: 'Angebote',
          short: 'Ang.',
          type: 'computed',
          compute: (r) => offersOf(r.id).length,
        },
      ],
      rules: [
        {
          when: (r) => r.phase === 'beauftragt' || r.phase === 'in Ausführung' || r.phase === 'abgenommen',
          check: (r) => offersOf(r.id).some((o) => o.state === 'beauftragt'),
          fields: ['phase'],
          message: 'Beauftragt heißt: eines der Angebote steht auf „beauftragt".',
        },
        {
          when: (r) => r.phase === 'abgenommen',
          require: ['final'],
          message: 'Nach der Abnahme gehört die Schlussrechnung dazu — sonst bleibt die Abweichung geraten.',
        },
        {
          when: (r) => Boolean(r.start && r.end),
          check: (r) => r.end >= r.start,
          fields: ['end'],
          message: 'Das Ende kann nicht vor dem Beginn liegen.',
        },
      ],
    },
    uid: () => 'G-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    emptyRecord: () => ({
      id: '',
      name: '',
      trade: TRADES[0],
      phase: PHASES[0],
      budget: 0,
      final: 0,
      start: '',
      end: '',
      note: '',
    }),
    seed: () =>
      [
        ['G-01', 'Dach neu eindecken', 'Dach', 'abgenommen', 42000, 44800, -120, -60, ''],
        ['G-02', 'Fenster erneuern (12 Stück)', 'Fenster', 'in Ausführung', 31000, 0, -25, 20, 'Zwei Fenster im Giebel nachgemessen.'],
        ['G-03', 'Elektroinstallation komplett', 'Elektro', 'beauftragt', 27000, 0, 15, 70, ''],
        ['G-04', 'Heizung: Wärmepumpe', 'Sanitär/Heizung', 'Angebote eingeholt', 38000, 0, 45, 100, 'Förderantrag läuft, Bescheid abwarten.'],
        ['G-05', 'Bäder (2)', 'Sanitär/Heizung', 'Angebote eingeholt', 24000, 0, 60, 110, ''],
        ['G-06', 'Estrich Erdgeschoss', 'Estrich', 'beauftragt', 9500, 0, 30, 40, ''],
        ['G-07', 'Trockenbau Dachgeschoss', 'Trockenbau', 'noch nicht angefragt', 12000, 0, 75, 105, ''],
        ['G-08', 'Malerarbeiten innen', 'Maler', 'noch nicht angefragt', 8000, 0, 120, 145, ''],
        ['G-09', 'Bodenbeläge', 'Boden', 'noch nicht angefragt', 11000, 0, 130, 150, 'Eiche Landhausdiele als Wunsch, Preis prüfen.'],
        ['G-10', 'Terrasse und Zuwegung', 'Außenanlage', 'noch nicht angefragt', 14000, 0, 180, 210, ''],
      ].map(([id, name, trade, phase, budget, final, startDays, endDays, note]) => ({
        id,
        name,
        trade,
        phase,
        budget,
        final,
        start: iso(startDays),
        end: iso(endDays),
        note,
      })),
    isDone: (r) => r.phase === 'abgenommen',
    isOverdue: (r) => r.phase === 'noch nicht angefragt' && r.start && r.start < iso(30),
  },

  offers: {
    schema: {
      idField: 'id',
      singular: 'Angebot',
      plural: 'Angebote',
      titleField: 'company',
      subField: null,
      list: ['company', 'tradeId', 'amount', 'perBudget', 'received', 'validUntil', 'state'],
      facets: ['state'],
      totalField: 'amount',
      fields: [
        { key: 'company', label: 'Firma', type: 'text', required: true },
        { key: 'tradeId', label: 'Gewerk', type: 'reference', entity: 'trades', required: true },
        { key: 'contact', label: 'Ansprechpartner', short: 'Kontakt', type: 'text' },
        { key: 'amount', label: 'Summe brutto (€)', short: '€', type: 'number' },
        { key: 'received', label: 'Eingegangen am', short: 'Eingang', type: 'date' },
        { key: 'validUntil', label: 'Bindefrist bis', short: 'Bindefrist', type: 'date' },
        { key: 'state', label: 'Status', type: 'enum', values: OFFER_STATE },
        { key: 'pdf', label: 'Angebot als Datei', short: 'PDF', type: 'attachment' },
        { key: 'note', label: 'Notiz', type: 'text', long: true },
        {
          key: 'perBudget',
          label: 'Anteil am Budget',
          short: '% Budget',
          type: 'computed',
          compute: (r) => {
            const trade = ENTITIES.trades.seed().find((t) => t.id === r.tradeId)
            if (!trade?.budget) return ''
            return Math.round(((Number(r.amount) || 0) / trade.budget) * 100) + ' %'
          },
        },
      ],
      rules: [
        {
          when: (r) => r.state !== 'angefragt',
          require: ['amount', 'received'],
          message: 'Ein vorliegendes Angebot hat eine Summe und ein Eingangsdatum.',
        },
        {
          when: (r) => r.state === 'abgelehnt',
          require: ['note'],
          message: 'Warum abgelehnt? In drei Monaten weiß das sonst niemand mehr.',
        },
      ],
    },
    uid: () => 'A-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    emptyRecord: () => ({
      id: '',
      company: '',
      tradeId: '',
      contact: '',
      amount: 0,
      received: '',
      validUntil: '',
      state: 'angefragt',
      pdf: null,
      note: '',
    }),
    seed: () =>
      [
        ['A-101', 'Dachdeckerei Brand', 'G-01', 'H. Brand', 43900, -180, -120, 'beauftragt', ''],
        ['A-102', 'Bedachungen Süd', 'G-01', '', 51200, -185, -130, 'abgelehnt', 'Deutlich teurer, Termin erst im Folgejahr.'],
        ['A-103', 'Fensterbau Weller', 'G-02', 'M. Weller', 29800, -70, -10, 'beauftragt', ''],
        ['A-104', 'Glas & Rahmen GmbH', 'G-02', '', 34500, -66, -6, 'abgelehnt', 'Aufmaß war unvollständig, Nachtrag wahrscheinlich.'],
        ['A-105', 'Elektro Lorenz', 'G-03', 'K. Lorenz', 26400, -40, 20, 'beauftragt', ''],
        ['A-106', 'Elektrotechnik Ahrens', 'G-03', '', 31900, -38, 15, 'abgelehnt', 'Preis nach Nachverhandlung immer noch höher.'],
        ['A-107', 'Haustechnik Voss', 'G-04', 'M. Voss', 41200, -12, 30, 'liegt vor', ''],
        ['A-108', 'Wärme & Bad Krüger', 'G-04', 'T. Krüger', 36800, -8, 34, 'nachverhandelt', 'Bereit, bei Beauftragung bis Monatsende 1.500 € nachzulassen.'],
        ['A-109', 'Sanitär Reinke', 'G-05', 'A. Reinke', 25900, -5, 40, 'liegt vor', ''],
        ['A-110', 'Bäderwelt Nord', 'G-05', '', 0, null, null, 'angefragt', 'Zweimal erinnert, bisher keine Rückmeldung.'],
        ['A-111', 'Estrich Behrens', 'G-06', 'S. Behrens', 9100, -22, 25, 'beauftragt', ''],
      ].map(([id, company, tradeId, contact, amount, receivedDays, validDays, state, note]) => ({
        id,
        company,
        tradeId,
        contact,
        amount,
        received: receivedDays === null ? '' : iso(receivedDays),
        validUntil: validDays === null ? '' : iso(validDays),
        state,
        pdf: null,
        note,
      })),
    isDone: (r) => r.state === 'beauftragt' || r.state === 'abgelehnt',
    /* Eine ablaufende Bindefrist ist der teuerste übersehene Termin am Bau. */
    isOverdue: (r) =>
      r.state !== 'abgelehnt' && r.state !== 'beauftragt' && r.validUntil && r.validUntil < iso(0),
  },
}

const offersOf = (tradeId) => ENTITIES.offers.seed().filter((o) => o.tradeId === tradeId)

export const formatDate = (s) => {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

export const DASHBOARD = {
  tiles: [
    { type: 'stat', entity: 'trades', measure: 'budget', label: 'Budget gesamt', caption: '€ über alle Gewerke' },
    {
      type: 'stat',
      entity: 'offers',
      measure: 'amount',
      filter: (r) => r.state === 'beauftragt',
      label: 'Beauftragt',
      caption: '€ bereits vergeben',
    },
    {
      type: 'stat',
      entity: 'trades',
      measure: 'count',
      filter: (r) => r.phase === 'noch nicht angefragt',
      label: 'Nicht angefragt',
      caption: 'Gewerke ohne Angebot',
    },
    { type: 'donut', entity: 'trades', groupBy: 'phase' },
    { type: 'bar', entity: 'trades', groupBy: 'trade', measure: 'budget', label: 'Budget je Kategorie (€)' },
    { type: 'bar', entity: 'offers', groupBy: 'state', measure: 'count', label: 'Angebote nach Status' },
  ],
}

export const WIZARD = {
  title: 'Angebot erfassen',
  intro: 'Erst das Gewerk, dann das Angebot dazu. Beides entsteht in einem Durchgang.',
  steps: [
    {
      id: 'gewerk',
      label: 'Gewerk',
      entity: 'trades',
      fields: ['name', 'trade', 'budget', 'start', 'end'],
    },
    {
      id: 'angebot',
      label: 'Angebot',
      entity: 'offers',
      fields: ['company', 'tradeId', 'contact', 'amount', 'received', 'validUntil', 'state', 'note'],
      when: (drafts) => Boolean(drafts.trades?.name),
    },
    { id: 'pruefen', label: 'Prüfen', type: 'review' },
  ],
  done: { message: 'Erfasst. Die Abweichung zum Budget rechnet sich mit.', allowAnother: true },
}
