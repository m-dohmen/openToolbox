// SPDX-License-Identifier: Apache-2.0
/**
 * Prüft jede gebaute Schaudemo einmal durch.
 *
 * Die Beispiele unter examples/ sind der Teil des Repositories, der am
 * ehesten still verrottet: Sie werden beim Entwickeln nicht angefasst, laufen
 * aber durch dieselbe Anwendung. Ein umbenanntes Feld oder eine geänderte
 * Schemaregel bricht sie, ohne dass eine der anderen Prüfungen etwas merkt.
 *
 * Geprüft wird deshalb pro Demo das Wenige, das immer gelten muss: sie rendert,
 * sie wirft keine Konsolenfehler, sie hat Datensätze, ihre berechneten Felder
 * liefern etwas, und die eingestellte Akzentfarbe kommt auch an.
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEMOS } from '../scripts/demos.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const fail = (m) => {
  console.error('FEHLER: ' + m)
  process.exitCode = 1
}

const missing = DEMOS.filter((d) => !existsSync(resolve(root, 'docs/demos', d.slug, 'index.html')))
if (missing.length) {
  console.error(`Nicht gebaut: ${missing.map((d) => d.slug).join(', ')} — 'npm run build:demo' fehlt.`)
  process.exit(1)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } })

for (const demo of DEMOS) {
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('file://' + resolve(root, 'docs/demos', demo.slug, 'index.html'))
  await page.waitForSelector('.home, .wizard, table tbody tr', { timeout: 8000 })

  // Startseite: jede Demo hat eine, und ihre Überschrift ist die aus demos.mjs.
  if (!(await page.locator('.home').count())) fail(`${demo.slug}: keine Startseite`)
  const headline = await page.locator('.prose h2').first().innerText()
  const expected = demo.home.split('\n')[0].replace(/^#\s*/, '')
  if (headline !== expected) fail(`${demo.slug}: Startseite zeigt "${headline}", erwartet "${expected}"`)
  await page.locator('.home__foot .btn--primary').click()

  const intake = demo.settings.mode === 'intake'
  let rows = 0
  let computed = 0

  if (intake) {
    await page.waitForSelector('.wizard')
    if (!(await page.locator('.wizard__rail li').count())) fail(`${demo.slug}: Wizard ohne Schritte`)
  } else {
    await page.waitForSelector('table tbody tr')
    rows = await page.locator('table tbody tr').count()
    if (rows < 5) fail(`${demo.slug}: nur ${rows} Zeilen — zu wenig für eine Demo`)

    /* Berechnete Spalten sind die häufigste Stelle, an der ein Beispiel bricht,
       weil sie über Feldnamen laufen, die sich still ändern können. */
    computed = await page.locator('td.cell-computed').count()
    const empty = await page
      .locator('td.cell-computed')
      .evaluateAll((cells) => cells.filter((c) => c.textContent.trim() === '—').length)
    if (computed && empty === computed) fail(`${demo.slug}: alle berechneten Zellen leer`)
  }

  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  )
  if (accent.toLowerCase() !== demo.colors.accent.toLowerCase()) {
    fail(`${demo.slug}: Akzentfarbe ${accent}, erwartet ${demo.colors.accent}`)
  }

  console.log(
    `${demo.slug.padEnd(20)} ${(intake ? 'Erfassung' : `${rows} Zeilen`).padEnd(11)}` +
      `${String(computed).padStart(3)} berechnete Zellen  ${accent}` +
      (errors.length ? `  KONSOLENFEHLER: ${errors.join(' | ')}` : ''),
  )
  if (errors.length) fail(`${demo.slug}: Konsolenfehler`)
  await page.close()
}

console.log(`\n${DEMOS.length} Demos geprüft.`)
await browser.close()
