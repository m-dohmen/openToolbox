// SPDX-License-Identifier: Apache-2.0
/**
 * Erzeugt zwei Bilder der Klassenfahrt-Demo: einmal die Liste, einmal das
 * Kanban-Board. Eine dritte Datei legt beide nebeneinander ab, weil die
 * Übergangsstelle "Was zeigt sich in der Tabelle, was zeigt sich im Board"
 * genau dann sichtbar wird, wenn man sie nebeneinander sieht.
 *
 *   node scripts/screenshots-school-trip-board.mjs
 *
 * Schreibt:
 *   docs/screenshots/school-trip-table.png
 *   docs/screenshots/school-trip-board.png
 *   docs/screenshots/school-trip-board-table.png    (Nebeneinander)
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const demo = resolve(root, 'docs/demos/school-trip/index.html')
const out = resolve(root, 'docs/screenshots')
mkdirSync(out, { recursive: true })

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

await page.goto('file://' + demo)
await page.waitForSelector('.home', { timeout: 8000 })
await page.locator('.home__foot .btn--primary').click()
await page.waitForSelector('table tbody tr')
await page.waitForTimeout(250)
await page.screenshot({ path: resolve(out, 'school-trip-table.png'), fullPage: false })

await page.getByRole('tab', { name: /Kanban|Board/ }).click()
await page.waitForSelector('.board')
await page.waitForTimeout(250)
await page.screenshot({ path: resolve(out, 'school-trip-board.png'), fullPage: false })

await browser.close()

/* Drittes Bild: beide PNGs in einer einfachen HTML-Seite nebeneinander.
   Kein Imagemagick, kein PIL — der Browser setzt das Bild zusammen. */
const tableData = readFileSync(resolve(out, 'school-trip-table.png')).toString('base64')
const boardData = readFileSync(resolve(out, 'school-trip-board.png')).toString('base64')
const html = `<!doctype html><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; background: #f5f6f8; font-family: -apple-system, system-ui, sans-serif; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px; }
  figure { margin: 0; }
  figcaption { font-size: 18px; font-weight: 600; color: #1b2333; padding: 0 4px 12px; letter-spacing: 0.01em; }
  img { display: block; width: 100%; height: auto; border: 1px solid #d6dae0; border-radius: 8px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
</style>
<section class="pair">
  <figure><figcaption>List</figcaption><img src="data:image/png;base64,${tableData}"></figure>
  <figure><figcaption>Board</figcaption><img src="data:image/png;base64,${boardData}"></figure>
</section>`

const pairBrowser = await chromium.launch()
const pairCtx = await pairBrowser.newContext({
  viewport: { width: 2824, height: 940 },
  deviceScaleFactor: 2,
})
const pairPage = await pairCtx.newPage()
await pairPage.setContent(html, { waitUntil: 'load' })
await pairPage.waitForTimeout(200)
await pairPage.screenshot({ path: resolve(out, 'school-trip-board-table.png'), fullPage: true })
await pairBrowser.close()

console.log('school-trip-table.png + school-trip-board.png + school-trip-board-table.png written.')
