// SPDX-License-Identifier: Apache-2.0
/*
 * Domain-Austausch fuer die Build-Pruefungen: smoke.mjs und multi-entity.mjs
 * spielen fuer einzelne Abschnitte eine Fixture nach src/domain.js ein,
 * bauen und stellen danach den Originalstand wieder her. Das gehoert an
 * genau diese eine Stelle, weil zwei unabhaengige Austausch-Stellen sich
 * unter gleichzeitigen Suite-Laeufen gegenseitig den Originalstand wegnehmen -
 * am Ende stand eine Fixture in src/domain.js statt eines echten Werkzeugs.
 *
 * Drei Schutzschichten, damit ein abgebrochener Lauf keine Fixture als
 * "Original" hinterlaesst oder durchreicht (OPEN-81):
 * - Ein Sperrverzeichnis serialisiert die Austausch-Bloecke maschinenweit;
 *   die PID im Inneren zeigt an, wenn ein gestorbener Lauf es stehen liess.
 *   Jeder Lauf baut zusaetzlich in eigene Ausgabeverzeichnisse (Suffix aus
 *   der PID), sonst leert der eine Lauf per Vite das Verzeichnis, waehrend
 *   der andere hineinnavigiert.
 * - Vor jeder Mutation wandert der Originalstand als Anker NACH AUSSEN
 *   (tmpdir, nicht ins Repo - ein Kill hinterlässt dann keinen Diff im
 *   Arbeitsbaum). Gegen SIGKILL hilft kein Handler mehr; der naechste Lauf
 *   liest beim Anfassen der Sperre alle Anker gestorbener PIDs und stellt
 *   daraus zuerst den echten Originalstand her, bevor er ihn einliest.
 * - Waehrend des Austauschs fangen Signal- und Exit-Haender weiche Tode
 *   (SIGINT/SIGTERM/SIGHUP, process.exit) ab und schreiben den Originalstand
 *   zurueck, bevor der Prozess endet - mit erneutem Selbstschuss, damit der
 *   Exit-Status dem Signaltod entspricht.
 *
 * Der Anker heilt nur Schäden, die der Austausch selbst verursacht hat: Ein
 * Anker existiert genau zwischen Backup und Restaurierung. Handarbeiten an
 * src/domain.js in genau diesem Fenster waeren nicht von einer Mutation zu
 * unterscheiden und wuerden beim Naechstlauf vom Anker ueberschrieben - das
 * Restrisiko ist bewusst akzeptiert gegenueber dauerhaft liegenden Fixtures.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const domainPath = resolve(root, 'src/domain.js')
const lockDir = resolve(root, 'test/.domain-swap.lock')

/** Verzeichnisnamen-Zusatz, der diesen Lauf von jedem anderen trennt. */
export const pidSuffix = '-' + process.pid

/* Anker liegen pro Checkout getrennt: der Pfadhash trennt mehrere Klone auf
   derselben Maschine, die PID stammt aus dem Namen. */
const recoveryDir = join(tmpdir(), 'opentoolbox-domain-swap')
const recoveryPrefix =
  'original-' + createHash('sha256').update(root).digest('hex').slice(0, 12) + '-'

/* Signale, die einen Austausch weich abbrechen und daher noch restaurieren
   koennen. SIGKILL fehlt absichtlich: dafuer ist der Anker da. */
const SWAP_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP']

function acquireDomainLock() {
  for (;;) {
    try {
      mkdirSync(lockDir)
      writeFileSync(resolve(lockDir, 'pid'), String(process.pid))
      recoverOrphanedSwaps()
      return
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      let holder = 0
      try { holder = Number(readFileSync(resolve(lockDir, 'pid'), 'utf8')) } catch {}
      let gone = false
      try { process.kill(holder, 0) } catch (sigErr) { gone = sigErr.code === 'ESRCH' }
      if (!holder || gone) {
        rmSync(lockDir, { recursive: true, force: true })
        continue
      }
      // Blockierendes Warten ohne Timer: Atomics.wait schlaeft, statt zu rotieren.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200)
    }
  }
}

const releaseDomainLock = () => rmSync(lockDir, { recursive: true, force: true })

/**
 * Stellt Rueckstaende gestorbener Laeufe wieder her. Läuft ausschliesslich
 * unter der Sperre: Dann hält kein anderer Austausch, und ein vorhandener
 * Anker gehoert mit Sicherheit einem Toten - die PID im Namen dient nur der
 * Herkunftsangabe, nicht der Lebendigkeitspruefung (PID-Recycling waere hier
 * eine Falle). Gilt es je Anker mehrere, gewinnt der juengste: Zwischen zwei
 * Ankerkatastrophen liegt stets mindestens ein erfolgreicher Aufraeumlauf,
 * deshalb kann es real nur einen geben.
 */
function recoverOrphanedSwaps() {
  let names = []
  try {
    names = readdirSync(recoveryDir)
  } catch {
    return
  }
  const orphans = names
    .filter((name) => name.startsWith(recoveryPrefix) && name.endsWith('.js'))
    .map((name) => ({ path: join(recoveryDir, name), mtime: statSync(join(recoveryDir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  for (const [index, orphan] of orphans.entries()) {
    try {
      if (index === 0) writeFileSync(domainPath, readFileSync(orphan.path))
      rmSync(orphan.path, { force: true })
    } catch {}
  }
}

/**
 * Tauscht src/domain.js fuer die Dauer von `run()` gegen die Fixture und
 * stellt den Originalstand garantiert wieder her - auch wenn `run`
 * scheitert, weich signaltot endet oder sich per process.exit() abhaengt.
 * Der Baustein hinter buildWithDomain, damit die Crash- und Signal-Pruefungen
 * denselben Austausch ohne echten Vite-Build fahren koennen.
 */
export function swapWithDomain(fixturePath, run) {
  acquireDomainLock()
  const originalDomain = readFileSync(domainPath, 'utf8')
  mkdirSync(recoveryDir, { recursive: true })
  const anchorPath = join(recoveryDir, `${recoveryPrefix}${process.pid}.js`)
  writeFileSync(anchorPath, originalDomain)

  let swapped = false
  const finish = () => {
    if (!swapped) return
    swapped = false
    try { writeFileSync(domainPath, originalDomain) } catch {}
    try { rmSync(anchorPath, { force: true }) } catch {}
  }

  /* Erst restaurieren, dann den Tod nachholen: ohne Entfernen der Haender
     traefe der erneute Schuss denselben Haender und es ginge nichts vorbei. */
  const onSignal = (signal) => {
    finish()
    releaseDomainLock()
    for (const s of SWAP_SIGNALS) process.removeListener(s, onSignal)
    process.removeListener('exit', finish)
    process.kill(process.pid, signal)
  }
  /* 'exit' feuert auch bei process.exit() innerhalb von run(), wo kein
     finally mehr laeuft - synchron geschrieben, wie es dort verlangt ist. */
  process.on('exit', finish)
  for (const s of SWAP_SIGNALS) process.on(s, onSignal)

  try {
    swapped = true
    writeFileSync(domainPath, readFileSync(fixturePath, 'utf8'))
    return run()
  } finally {
    for (const s of SWAP_SIGNALS) process.removeListener(s, onSignal)
    process.removeListener('exit', finish)
    finish()
    releaseDomainLock()
  }
}

/**
 * Baut das Werkzeug einmalig mit einer anderen Domain und stellt src/domain.js
 * garantiert wieder her - auch wenn der Build scheitert. Liefert den Pfad der
 * gebauten index.html.
 */
export function buildWithDomain(fixturePath, outDirName) {
  swapWithDomain(fixturePath, () => {
    execFileSync('npx', ['vite', 'build', '--outDir', outDirName], { cwd: root, stdio: 'pipe' })
  })
  return resolve(root, outDirName, 'index.html')
}
