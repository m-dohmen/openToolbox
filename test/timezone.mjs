// SPDX-License-Identifier: Apache-2.0
// Fälligkeiten im lokalen Kalender, nicht in UTC (OPEN-73).
//
// domain.js bildet `iso()`, `isOverdue` und das berechnete Feld `daysLeft` auf
// Kalendertage ab. Rechnet es stattdessen mit UTC-Instants, kippen beide an
// Zonengrenzen: westlich von Greenwich liegt der UTC-Tag vor dem lokalen Tag
// (ein heute Fälliger wird zu früh rot), östlich davon hinter ihm (due=heute
// ergibt 1 statt 0 Tage übrig). Der Fehler zeigt sich nur, wenn UTC-Datum und
// lokales Datum auseinanderfallen - von der Wanduhr des Runners abhängig ist
// eine solche Prüfung nicht wirklich geprüft.
//
// Darum friert dieses Suite die Uhr auf zwei feste Instants ein (vor und nach
// 12:00 UTC) und lässt für jede Zone einen Kindprozess mit umgeschaltetem TZ
// laufen - die Umschaltung geschieht im Test selbst, nicht am Runner.
// Erwartet wird jeweils der lokale Kalendertag, unabhängig vom UTC-Datum.

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

/* Vor 12:00 UTC läuft der lokale Tag östlich von Greenwich dem UTC-Datum
   voraus, nach 12:00 UTC liegt der UTC-Tag westlich von Greenwich vor - mit
   beiden Instants fällt jede Zone mindestens einmal aus dem Gleichtritt. */
const INSTANTS = ['2026-08-24T02:30:00Z', '2026-08-24T13:30:00Z']
const ZONES = ['UTC', 'Pacific/Auckland', 'America/Los_Angeles']

/**
 * Läuft als Kindprozess mit eingefrorener Uhr: zählt alle Prüfungen dieser
 * Zone zu diesem Instant durch und meldet Fehlschläge auf stdout.
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
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
const shift = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d }

const today = ymd(new Date())
const yesterday = ymd(shift(-1))
const tomorrow = ymd(shift(1))
let failed = 0
const check = (name, cond) => {
  if (!cond) { console.error('FEHLER [' + Intl.DateTimeFormat().resolvedOptions().timeZone + ']: ' + name); failed++ }
}

/* seed(): Fälligkeiten relativ zum lokalen Tag, nicht zum UTC-Tag. Die
   Seedzeilen mit Offset -1 und +6 müssen genau den lokalen Kalendertagen
   entsprechen. */
const seeded = domain.seed()
check('seed Offset -1 = lokaler Vortag (' + yesterday + ')', seeded[5].due === yesterday)
check('seed Offset +6 = lokaler Tag in sechs Tagen', seeded[1].due === ymd(shift(6)))

/* isOverdue: heute ist nicht überfällig, gestern schon, morgen nicht -
   in jeder Zone gegen den LOKALEN heutigen Tag. */
check('isOverdue(due=heute) ist falsch', domain.isOverdue({ status: 'open', due: today }) === false)
check('isOverdue(due=gestern) ist wahr', domain.isOverdue({ status: 'open', due: yesterday }) === true)
check('isOverdue(due=morgen) ist falsch', domain.isOverdue({ status: 'open', due: tomorrow }) === false)
check('isOverdue respektiert done', domain.isOverdue({ status: 'done', due: yesterday }) === false)

/* daysLeft: das berechnete Feld zählt ganze lokale Tage, ohne Rundungsrettung. */
const compute = domain.SCHEMA.fields.find((f) => f.key === 'daysLeft').compute
check('daysLeft(due=heute) ist 0', compute({ status: 'open', due: today }) === 0)
check('daysLeft(due=gestern) ist -1', compute({ status: 'open', due: yesterday }) === -1)
check('daysLeft(due=morgen) ist 1', compute({ status: 'open', due: tomorrow }) === 1)
check("daysLeft ist leer ohne Fälligkeit", compute({ status: 'open', due: '' }) === '')
check("daysLeft ist leer bei done", compute({ status: 'done', due: today }) === '')

process.exit(failed ? 1 : 0)
`

let failed = 0

for (const zone of ZONES) {
  for (const instant of INSTANTS) {
    const label = `${zone} @ ${instant}`
    const run = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', PROBE, resolve(root, 'src/domain.js'), String(Date.parse(instant))],
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

if (failed) {
  console.error(`\n${failed} Zeitzonen-Läufe fehlgeschlagen.`)
  process.exit(1)
}
console.log('timezone: alle Zeitzonen-Fixtures grün.')
