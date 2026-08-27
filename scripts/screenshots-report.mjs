// SPDX-License-Identifier: Apache-2.0
/**
 * Erzeugt zwei Screenshots rund um die Berichtskopie (OPEN-93).
 *
 *   npm run screenshots:report
 *
 * Bewusst eine eigene Datei: der `screenshots.mjs`-Lauf erzeugt schon ohne
 * Codeaenderung Byte-Diffs an mehreren Bildern (Beispiel: das `list`-Bild
 * zeigt jetzt den Berichtskopie-Button in der Exchange-Gruppe). Fuer den
 * OPEN-101-PR brauchen wir genau zwei neue Bilder, ohne die bestehenden
 * anzufassen - ein erneuter `screenshots`-Lauf waere Rauschen, das der
 * Reviewer nach der Ursache durchsucht.
 *
 * - `docs/screenshots/report-sidebar.png` - die Quell-Datei mit Sidebar und
 *   sichtbarem Berichtskopie-Button in der Exchange-Gruppe.
 * - `docs/screenshots/report-banner.png` - die exportierte Berichtskopie mit
 *   Banner (Label / Version / Exportdatum) ueber der Dateileiste.
 */
import { chromium } from 'playwright'
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const demo = resolve(root, 'docs/demo/index.html')
const out = resolve(root, 'docs/screenshots')
const tmpDir = resolve(root, 'test/.out')
mkdirSync(out, { recursive: true })
mkdirSync(tmpDir, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1360, height: 860 },
  deviceScaleFactor: 2,
  acceptDownloads: true,
})
await ctx.addInitScript(() => {
  delete window.showSaveFilePicker
})
const page = await ctx.newPage()
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[browser:error]', msg.text())
})
page.on('pageerror', (err) => console.log('[browser:pageerror]', err.message))

/* Originaldemo: Startseite, dann Liste, damit die Sidebar mit dem
   Berichtskopie-Button sichtbar ist. Die Demo laeuft auf Englisch
   (DEFAULT_LOCALE), also passt der englische Button-Text. */
await page.goto('file://' + demo)
await page.waitForSelector('.home')
await page.locator('.home__foot .btn--primary').click()
await page.waitForSelector('table tbody tr')
await page.waitForTimeout(250)

/* Sidebar voll im Bild - der Knopf "Export a read-only copy" in der
   Exchange-Gruppe ist der Punkt des Bildes. Vorher die Exchange-Gruppe
   in den Sichtbereich scrollen, damit das Bild die ganze Sidebar mit
   allen Bereichen untereinander zeigt. */
const reportBtn = page
  .locator('aside.rail button', { hasText: 'Export a read-only copy' })
await reportBtn.scrollIntoViewIfNeeded()
await page.waitForTimeout(150)
const sidebar = page.locator('aside.rail')
await sidebar.screenshot({
  path: resolve(out, 'report-sidebar.png'),
})

/* Berichtskopie aus der Sidebar ausloesen und die heruntergeladene Datei
   fuer den zweiten Screenshot aufheben. */
const [reportDownload] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  reportBtn.click(),
])
const reportPath = resolve(tmpDir, 'shot-report.html')
await reportDownload.saveAs(reportPath)

/* Berichtskopie im selben Kontext oeffnen - der Banner sitzt dort oben. */
await page.goto('file://' + reportPath)
await page.waitForSelector('.report-banner')
/* Liste zeigen, damit der Vergleich mit der Originaldatei moeglich ist
   (gleiches Layout, oben nur der Banner und die Dateileiste). */
await page.locator('.home__foot .btn--primary').click().catch(() => {})
await page.waitForSelector('table tbody tr, .report-banner')
await page.waitForTimeout(250)

await page.screenshot({
  path: resolve(out, 'report-banner.png'),
})

/* Die heruntergeladene Datei aus dem Build-Artefakt-Pfad nach
   `test/.out/shot-report.html` kopieren, damit sie im Repo liegt und im
   PR referenzierbar ist (klein, kein Bundle-Output, nur Pruefstein). */
copyFileSync(reportPath, resolve(tmpDir, 'shot-report.html'))

await browser.close()
console.log('Report screenshots written to docs/screenshots/report-sidebar.png and report-banner.png')
