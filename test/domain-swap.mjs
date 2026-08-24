// SPDX-License-Identifier: Apache-2.0
/*
 * Domain-Austausch fuer die Build-Pruefungen: smoke.mjs und multi-entity.mjs
 * spielen fuer einzelne Abschnitte eine Fixture nach src/domain.js ein,
 * bauen und stellen danach den Originalstand wieder her. Das gehoert an
 * genau diese eine Stelle, weil zwei unabhaengige Austausch-Stellen sich
 * unter gleichzeitigen Suite-Laeufen gegenseitig den Originalstand wegnehmen -
 * am Ende stand eine Fixture in src/domain.js statt eines echten Werkzeugs.
 *
 * Zwei Schutzmechanismen gegen gleichzeitige Laeufe auf einer Maschine:
 * - Jeder Lauf baut in eigene Ausgabeverzeichnisse (Suffix aus der PID),
 *   sonst leert der eine Lauf per Vite das Verzeichnis, waehrend der andere
 *   hineinnavigiert.
 * - Ein Sperrverzeichnis serialisiert die Austausch-Bloecke maschinenweit;
 *   die PID im Inneren zeigt an, wenn ein gestorbener Lauf es stehen liess.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const domainPath = resolve(root, 'src/domain.js')
const lockDir = resolve(root, 'test/.domain-swap.lock')

/** Verzeichnisnamen-Zusatz, der diesen Lauf von jedem anderen trennt. */
export const pidSuffix = '-' + process.pid

function acquireDomainLock() {
  for (;;) {
    try {
      mkdirSync(lockDir)
      writeFileSync(resolve(lockDir, 'pid'), String(process.pid))
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
 * Baut das Werkzeug einmalig mit einer anderen Domain und stellt src/domain.js
 * garantiert wieder her - auch wenn der Build scheitert. Liefert den Pfad der
 * gebauten index.html.
 */
export function buildWithDomain(fixturePath, outDirName) {
  acquireDomainLock()
  try {
    const originalDomain = readFileSync(domainPath, 'utf8')
    writeFileSync(domainPath, readFileSync(fixturePath, 'utf8'))
    try {
      execFileSync('npx', ['vite', 'build', '--outDir', outDirName], { cwd: root, stdio: 'pipe' })
    } finally {
      writeFileSync(domainPath, originalDomain)
    }
  } finally {
    releaseDomainLock()
  }
  return resolve(root, outDirName, 'index.html')
}
