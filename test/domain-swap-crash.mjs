// SPDX-License-Identifier: Apache-2.0
/*
 * Crash-Sicherheit des Fixture-Austauschs (OPEN-81): try/finally rettet den
 * Originalstand von src/domain.js bei geworfenen Fehlern, aber nicht bei einem
 * harten Signaltod - genau dann bleibt die Fixture liegen, und ein Folgelauf
 * liest die Mutation als "Original" zurueck. Diese Kette prueft beide Zaune:
 *
 * 1. Negativeingangsfall: ein sauberer Lauf hinterlässt weder veraenderte
 *    Datei noch Sperrverzeichnis.
 * 2. Ein weiches Signal (SIGTERM) stellt noch im Sterben den Originalstand her.
 * 3. Ein mit SIGKILL getoeteter Lauf hinterlässt die Mutation augenblicklich -
 *    gegen SIGKILL kommt kein Handler an -, aber der naechste Austausch muss
 *    zuerst den echten Originalstand wiederherstellen, statt die Mutation als
 *    "Original" zu behandeln.
 *
 * Die Kinder laufen als eigene Prozesse, weil sich ein Signaltod im
 * Prüfprozess selbst nicht erzwingen lässt; das Kindskript liegt unter
 * test/.out/ und importiert dasselbe test/domain-swap.mjs wie die Suiten.
 * Jedes Opfer bekommt eine eigene Fixture - am Dateiinhalt ist dann eindeutig,
 * WESSEN Austausch die Pruefung gerade sieht, nicht nur dass irgendeiner lief.
 */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { swapWithDomain } from './domain-swap.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const domainPath = resolve(root, 'src/domain.js')
const tmp = resolve(root, 'test/.out')
mkdirSync(tmp, { recursive: true })

const fail = (m) => {
  console.error('FEHLER: ' + m)
  process.exitCode = 1
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

/* Kindskript: haengt im Austausch (sync blockiert, damit das return im
   Austauschblock nicht vorher restauriert) oder durchlaeuft ihn einmal sauber. */
const childScript = resolve(tmp, 'domain-swap-crash-child.mjs')
writeFileSync(
  childScript,
  "import { swapWithDomain } from '" + resolve(root, 'test/domain-swap.mjs') + "'\n" +
    'const [fixture, mode] = process.argv.slice(2)\n' +
    'const block = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)\n' +
    "swapWithDomain(fixture, () => { if (mode === 'hang') block(120000) })\n",
)

function runChild(args) {
  const child = spawn(process.execPath, [childScript, ...args], { stdio: 'pipe' })
  child.stdout.resume()
  child.stderr.resume()
  return child
}

/** Wartet, bis der Inhalt von src/domain.js den erwarteten Austausch zeigt. */
function waitForSwap(expectedContent, child) {
  for (let i = 0; i < 300; i++) {
    if (readFileSync(domainPath, 'utf8') === expectedContent) return true
    if (child.exitCode !== null || child.signalCode !== null) return false
    sleep(100)
  }
  return false
}

/* Die Pruefung misst RELATIV zum Stand unmittelbar vor jedem Opfer - nicht
   gegen einen als "original" angenommenen Inhalt. Sonst segnet eine Kette, die
   auf eine vorgaengige Mutation trifft (abgestuerzter Lauf ohne Folgelauf),
   deren Rueckstaende stillschweigend als gut. Die Pruefung selbst darf
   ebenfalls nie als Mutationsquelle in Erscheinung treten: Egal wie die Kette
   ausgeht, dahinter liegt genau der Stand von vor der Kette. */
const baseline = readFileSync(domainPath, 'utf8')
try {
  const fixtureDue = resolve(root, 'test/fixtures/due-date.domain.js')
  const fixtureMetrics = resolve(root, 'test/fixtures/metrics.domain.js')
  const fixtureDueContent = readFileSync(fixtureDue, 'utf8')
  const fixtureMetricsContent = readFileSync(fixtureMetrics, 'utf8')

  /*
   * 1) Negativeingangsfall: sauberer Lauf, keine Rueckstaende - sonst faengt
   *    eine spaetere Pruefung eine Mutation ein, die nie stattfand.
   */
  {
    swapWithDomain(fixtureDue, () => {})
    const untouched = readFileSync(domainPath, 'utf8') === baseline
    const lockGone = !existsSync(resolve(root, 'test/.domain-swap.lock'))
    console.log('C1) Sauberer Lauf — Ausgangsstand:', untouched, '| Sperrverzeichnis aufgeräumt:', lockGone)
    if (!untouched) fail('Sauberer Lauf hat src/domain.js veraendert')
    if (!lockGone) fail('Sauberer Lauf hat das Sperrverzeichnis stehen lassen')
  }

  /*
   * 2) Weiches Signal waehrend des Austauschs: das Kind soll den Ausgangsstand
   *    noch im Sterben zurueckschreiben - sofort, ohne Folgelauf.
   */
  {
    const victim = runChild([fixtureMetrics, 'hang'])
    const entered = waitForSwap(fixtureMetricsContent, victim)
    if (entered) {
      victim.kill('SIGTERM')
      await new Promise((r) => victim.on('exit', r))
    }
    const restored = readFileSync(domainPath, 'utf8') === baseline
    console.log('C2) SIGTERM waehrend des Austauschs:', restored ? 'Ausgangsstand zurueck' : 'Fixture blieb liegen')
    if (!entered) fail('Kind ist nicht in den Austausch eingetreten - Pruefung misst nichts')
    else if (!restored) fail('SIGTERM hat die Fixture in src/domain.js stehen lassen')
  }

  /*
   * 3) Hart gekillter Lauf plus Folgelauf: der Folgelauf entscheidet, ob die
   *    Mutation als "Original" durchgereicht wurde - der Massstab ist der
   *    Stand vor dem Opfer, nicht der Fixture-Inhalt.
   */
  {
    const victim = runChild([fixtureDue, 'hang'])
    const entered = waitForSwap(fixtureDueContent, victim)
    if (entered) {
      victim.kill('SIGKILL')
      await new Promise((r) => victim.on('exit', r))
    }

    const followUp = runChild([fixtureMetrics, 'clean'])
    const followUpCode = await new Promise((r) => followUp.on('exit', r))
    const restored = readFileSync(domainPath, 'utf8') === baseline
    console.log('C3) Folgelauf nach SIGKILL stellt Ausgangsstand wieder her:', restored)
    if (!entered) fail('Kind ist nicht in den Austausch eingetreten - Pruefung misst nichts')
    if (followUpCode !== 0) fail('Folgelauf nach SIGKILL scheiterte (Exit ' + followUpCode + ')')
    if (!restored) {
      fail('Der Folgelauf hat die Mutation des gekillten Laufs als "Original" behandelt')
    }
  }
} finally {
  rmSync(childScript, { force: true })
  writeFileSync(domainPath, baseline)
}
if (!process.exitCode) console.log('Crash-Kette: alle Pruefungen bestanden')
