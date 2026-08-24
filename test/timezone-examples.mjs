// SPDX-License-Identifier: Apache-2.0
// Fälligkeiten in den Beispieldomänen im lokalen Kalender, nicht in UTC
// (OPEN-83). Dieselbe Prüfführung wie timezone.mjs für src/domain.js, hier
// über alle acht Domänen unter examples/.
//
// Baut eine Domäne ihre Tageswerte auf UTC-Instants (`toISOString`,
// `new Date('YYYY-MM-DD')`, `Math.round`-Rettung), kippen Seeddaten,
// berechnete Resttage und `isOverdue` an Zonengrenzen: westlich von
// Greenwich wird zu früh rot, ab UTC+12 kippt die Rundung. Der Fehler zeigt
// sich nur, wenn UTC-Datum und lokales Datum auseinanderfallen - von der
// Wanduhr des Runners abhängig ist eine solche Prüfung nicht wirklich
// geprüft.
//
// Darum friert auch dieses Suite die Uhr auf zwei feste Instants ein (vor
// und nach 12:00 UTC) und lässt für jede Zone einen Kindprozess mit
// umgeschaltetem TZ laufen. Zusätzlich hält eine Quellprüfung die Regeln
// fest: kein `toISOString`, kein mit `Math.round` geretteter Tagesvergleich
// in examples/.

import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { basename, dirname, join, resolve } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const examplesDir = resolve(root, 'examples')

/* Vor 12:00 UTC läuft der lokale Tag östlich von Greenwich dem UTC-Datum
   voraus, nach 12:00 UTC liegt der UTC-Tag westlich von Greenwich vor - mit
   beiden Instants fällt jede Zone mindestens einmal aus dem Gleichtritt. */
const INSTANTS = ['2026-08-24T02:30:00Z', '2026-08-24T13:30:00Z']
const ZONES = ['UTC', 'Pacific/Auckland', 'America/Los_Angeles']

/* Statische Regelprüfung: die Muster, die OPEN-83 entfernt hat, dürfen sich
   in keiner Beispieldomäne wieder ansammeln. Prozent-Rundungen bleiben
   erlaubt - gefahndet wird nur auf Tagesvergleichen mit 86400000. */
let staticFailed = 0
for (const file of readdirSync(examplesDir).filter((f) => f.endsWith('.domain.js')).sort()) {
  const source = readFileSync(join(examplesDir, file), 'utf8')
  if (/toISOString/.test(source)) {
    console.error(`FEHLER: ${file} bildet Kalendertage über toISOString()`)
    staticFailed++
  }
  if (/Math\.round[^\n]*86400000/.test(source)) {
    console.error(`FEHLER: ${file} rettet einen Tagesvergleich mit Math.round`)
    staticFailed++
  }
}
if (staticFailed) process.exit(1)

/**
 * Läuft als Kindprozess mit eingefrorener Uhr: prüft eine Domäne in einer
 * Zone zu einem Instant und meldet Fehlschläge auf stderr.
 */
const PROBE = `
const [domainPath, fixedMs] = process.argv.slice(1)
const fixed = Number(fixedMs)
class FrozenDate extends Date {
  constructor(...args) { super(...(args.length === 0 ? [fixed] : args)) }
  static now() { return fixed }
}
globalThis.Date = FrozenDate

const domain = await import(domainPath)
const name = domainPath.split('/').pop()

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
const shift = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d }
const de = (s) => { if (!s) return ''; const [y, m, d] = s.split('-'); return d + '.' + m + '.' + y }

const today = ymd(new Date())
const yesterday = ymd(shift(-1))
const tomorrow = ymd(shift(1))
let failed = 0
const check = (label, cond) => {
  if (!cond) { console.error('FEHLER [' + Intl.DateTimeFormat().resolvedOptions().timeZone + ']: ' + label); failed++ }
}
const computed = (schema, key) => schema.fields.find((f) => f.key === key).compute

if (name === 'risk-register.domain.js') {
  check('isOverdue: review heute ist falsch', !domain.isOverdue({ review: today }))
  check('isOverdue: review gestern ist wahr', Boolean(domain.isOverdue({ review: yesterday })))
  check('isOverdue: review morgen ist falsch', !domain.isOverdue({ review: tomorrow }))
  check('isOverdue: ohne review ist falsch', !domain.isOverdue({ review: '' }))
}

if (name === 'suppliers-certificates.domain.js') {
  const certs = domain.ENTITIES.certificates.seed()
  check("seed 'PCI-DSS quarterly scan': Ablauf = lokaler Tag vor 30", certs.find((r) => r.title === 'PCI-DSS quarterly scan').expiry === ymd(shift(-30)))
  check("seed 'ISO 27001 cloud infrastructure': Ablauf = lokaler Tag in 30", certs.find((r) => r.title === 'ISO 27001 cloud infrastructure').expiry === ymd(shift(30)))
  check('isOverdue: expiry heute ist falsch', !domain.ENTITIES.certificates.isOverdue({ expiry: today }))
  check('isOverdue: expiry gestern ist wahr', Boolean(domain.ENTITIES.certificates.isOverdue({ expiry: yesterday })))
  check('isOverdue: ohne expiry ist falsch', !domain.ENTITIES.certificates.isOverdue({ expiry: '' }))
}

if (name === 'portfolio.domain.js') {
  const milestones = domain.ENTITIES.milestones.seed()
  check("seed 'Accessibility audit passed': fällig = lokaler Tag in 27", milestones.find((r) => r.title === 'Accessibility audit passed').due === ymd(shift(27)))
  check("seed 'Final data extract archived': fällig = lokaler Tag vor 35", milestones.find((r) => r.title === 'Final data extract archived').due === ymd(shift(-35)))
  const daysLeft = computed(domain.ENTITIES.milestones.schema, 'daysLeft')
  check('daysLeft: fällig heute ist 0', daysLeft({ status: 'open', due: today }) === 0)
  check('daysLeft: fällig gestern ist -1', daysLeft({ status: 'open', due: yesterday }) === -1)
  check('daysLeft: fällig morgen ist 1', daysLeft({ status: 'open', due: tomorrow }) === 1)
  check('daysLeft ist leer ohne Fälligkeit', daysLeft({ status: 'open', due: '' }) === '')
  check('daysLeft ist leer bei done', daysLeft({ status: 'done', due: today }) === '')
  check('projects isOverdue: Ende heute ist falsch', !domain.ENTITIES.projects.isOverdue({ phase: 'Delivery', end: today }))
  check('projects isOverdue: Ende gestern ist wahr', Boolean(domain.ENTITIES.projects.isOverdue({ phase: 'Delivery', end: yesterday })))
  check('projects isOverdue: Closed ist nie wahr', !domain.ENTITIES.projects.isOverdue({ phase: 'Closed', end: yesterday }))
  check('milestones isOverdue: fällig heute ist falsch', !domain.ENTITIES.milestones.isOverdue({ status: 'open', due: today }))
  check('milestones isOverdue: fällig gestern ist wahr', Boolean(domain.ENTITIES.milestones.isOverdue({ status: 'open', due: yesterday })))
  check('milestones isOverdue: done ist nie wahr', !domain.ENTITIES.milestones.isOverdue({ status: 'done', due: yesterday }))
}

if (name === 'ppwr-packaging.domain.js') {
  const seeded = domain.ENTITIES.packagings.seed()
  check('seed V-107: Frist = lokaler Vortag (' + yesterday + ')', seeded.find((r) => r.id === 'V-107').deadline === yesterday)
  check('seed V-104: Frist = lokaler Tag in 40', seeded.find((r) => r.id === 'V-104').deadline === ymd(shift(40)))
  const overdue = domain.ENTITIES.packagings.isOverdue
  check('isOverdue: Frist heute ist falsch', !overdue({ docStatus: 'Angaben liegen vor', deadline: today }))
  check('isOverdue: Frist gestern ist wahr', Boolean(overdue({ docStatus: 'nicht begonnen', deadline: yesterday })))
  check('isOverdue: Erklärung erstellt ist nie wahr', !overdue({ docStatus: 'Erklärung erstellt', deadline: yesterday }))
}

if (name === 'renovation-quotes.domain.js') {
  const trades = domain.ENTITIES.trades
  check('seed G-10: Baubeginn = lokaler Tag in 180', trades.seed().find((r) => r.id === 'G-10').start === ymd(shift(180)))
  check('isOverdue: nicht angefragt, Start in 29 Tagen ist wahr', Boolean(trades.isOverdue({ phase: 'noch nicht angefragt', start: ymd(shift(29)) })))
  check('isOverdue: Grenze - Start in genau 30 Tagen ist falsch', !trades.isOverdue({ phase: 'noch nicht angefragt', start: ymd(shift(30)) }))
  check('isOverdue: beauftragte Gewerke sind nie wahr', !trades.isOverdue({ phase: 'beauftragt', start: yesterday }))
  const offers = domain.ENTITIES.offers
  check("seed 'Malermeister Roth': Bindefrist = lokaler Tag in 60", offers.seed().find((r) => r.company === 'Malermeister Roth').validUntil === ymd(shift(60)))
  check('isOverdue: Bindefrist heute ist falsch', !offers.isOverdue({ state: 'liegt vor', validUntil: today }))
  check('isOverdue: Bindefrist gestern ist wahr', Boolean(offers.isOverdue({ state: 'liegt vor', validUntil: yesterday })))
  check('isOverdue: abgelehnte Angebote sind nie wahr', !offers.isOverdue({ state: 'abgelehnt', validUntil: yesterday }))
}

if (name === 'gdpr-processing.domain.js') {
  const seeded = domain.seed()
  check('seed VT-007: ohne Prüfdatum bleibt es leer', seeded.find((r) => r.id === 'VT-007').reviewed === '')
  check('seed VT-009: geprüft = lokaler Tag vor 5', seeded.find((r) => r.id === 'VT-009').reviewed === ymd(shift(-5)))
  const age = computed(domain.SCHEMA, 'age')
  check('age: heute geprüft ist 0', age({ reviewed: today }) === 0)
  check('age: gestern geprüft ist 1', age({ reviewed: yesterday }) === 1)
  check('age: morgen geprüft ist -1', age({ reviewed: tomorrow }) === -1)
  check('age ist leer ohne Prüfdatum', age({ reviewed: '' }) === '')
  check('isOverdue: nie geprüft ist wahr', Boolean(domain.isOverdue({ reviewed: '' })))
  check('isOverdue: heute geprüft ist falsch', !domain.isOverdue({ reviewed: today }))
  check('isOverdue: genau 365 Tage ist falsch (Grenze)', !domain.isOverdue({ reviewed: ymd(shift(-365)) }))
  check('isOverdue: 366 Tage ist wahr', Boolean(domain.isOverdue({ reviewed: ymd(shift(-366)) })))
}

if (name === 'equipment-testing.domain.js') {
  const seeded = domain.seed()
  check('seed BM-1013: letzte Prüfung = lokaler Vortag (' + yesterday + ')', seeded.find((r) => r.id === 'BM-1013').lastTest === yesterday)
  check('seed BM-1009: letzte Prüfung = lokaler Tag vor 20', seeded.find((r) => r.id === 'BM-1009').lastTest === ymd(shift(-20)))
  const dueField = computed(domain.SCHEMA, 'due')
  const daysLeft = computed(domain.SCHEMA, 'daysLeft')
  /* Sechs Monate vor heute liegt die Fälligkeit auf genau heute - der
     Monats-Lauf um setMonth darf dabei weder Zone noch Rundung sehen. */
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixMonthsAgoMinusDay = new Date(sixMonthsAgo); sixMonthsAgoMinusDay.setDate(sixMonthsAgo.getDate() - 1)
  const dueToday = { result: 'bestanden', interval: '6', lastTest: ymd(sixMonthsAgo) }
  const dueYesterday = { result: 'bestanden', interval: '6', lastTest: ymd(sixMonthsAgoMinusDay) }
  check('due: Fälligkeit heute erscheint als heutiges Datum', dueField(dueToday) === de(today))
  check('daysLeft: Fälligkeit heute ist 0', daysLeft(dueToday) === 0)
  check('daysLeft: Fälligkeit gestern ist -1', daysLeft(dueYesterday) === -1)
  check('daysLeft ist leer ohne letzte Prüfung', daysLeft({ result: 'bestanden', interval: '6', lastTest: '' }) === '')
  check('isOverdue: Fälligkeit heute ist falsch', !domain.isOverdue(dueToday))
  check('isOverdue: Fälligkeit gestern ist wahr', Boolean(domain.isOverdue(dueYesterday)))
  check('isOverdue: „nicht bestanden" ist immer wahr', Boolean(domain.isOverdue({ result: 'nicht bestanden', interval: '6', lastTest: '' })))
}

if (name === 'school-trip.domain.js') {
  /* Kein Datumsfeld in dieser Domäne - sie muss nur fehlerfrei laden. */
  check('Domäne lädt ohne Datumslogik', typeof domain.seed === 'function')
}

process.exit(failed ? 1 : 0)
`

let failed = 0

for (const zone of ZONES) {
  for (const instant of INSTANTS) {
    for (const file of readdirSync(examplesDir).filter((f) => f.endsWith('.domain.js')).sort()) {
      const label = `${file}: ${zone} @ ${instant}`
      const run = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', PROBE, join(examplesDir, file), String(Date.parse(instant))],
        {
          env: { ...process.env, TZ: zone },
          encoding: 'utf8',
          timeout: 30000,
        },
      )
      if (run.status !== 0 || run.stderr.trim()) {
        console.error(`FEHLER: ${label}`)
        if (run.stdout.trim()) console.error(run.stdout.trim())
        if (run.stderr.trim()) console.error(run.stderr.trim())
        failed++
      }
    }
  }
}

if (failed) {
  console.error(`\n${failed} Zeitzonen-Läufe fehlgeschlagen.`)
  process.exit(1)
}
console.log('timezone-examples: alle Zeitzonen-Fixtures grün.')
