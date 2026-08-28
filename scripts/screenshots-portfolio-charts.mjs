// SPDX-License-Identifier: Apache-2.0
/**
 * Erzeugt ein Bild des portfolio-Dashboards, das die Diagramme aus dem
 * neuen `chart`-Block zeigt. Standardmäßig liegt die Tiles-Reihe mit
 * Projekt-Phase-Donut und Phase-Budget-Balken noch im Viewport; die
 * Charts darunter rutschen heraus. Hier wird das Dashboard gerendert,
 * bis zur Charts-Reihe gescrollt und dann ein fullPage-Screenshot
 * geschrieben.
 *
 *   node scripts/screenshots-portfolio-charts.mjs
 *
 * Schreibt:
 *   docs/screenshots/portfolio-charts.png
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const demo = resolve(root, 'docs/demo/index.html')
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
await page.waitForSelector('.home')
await page.locator('.home__foot .btn--primary').click()
await page.waitForSelector('table tbody tr')
await page.getByRole('tab', { name: 'Dashboard' }).click()
await page.waitForSelector('.dashboard')
await page.waitForTimeout(300)

// Hinweis-Banner aus, damit das Bild nicht von Hinweistext verdeckt wird.
await page.getByLabel('Settings').click()
await page.waitForSelector('.settings')
const toggle = page.getByText('hidden', { exact: true })
if (await toggle.count()) await toggle.click()
await page.getByRole('button', { name: 'Back to the list' }).click()
await page.waitForSelector('table tbody tr')
await page.waitForTimeout(200)
await page.getByRole('tab', { name: 'Dashboard' }).click()
await page.waitForSelector('.dashboard')
await page.waitForTimeout(300)

// Scrollt zur ersten Chart-Kachel und schneidet ab dort mit, damit die
// Balken-/Linie-Reihe komplett im Bild liegt.
const charts = page.locator('.tile:has(.bars), .tile:has(.line-chart)')
await charts.first().scrollIntoViewIfNeeded()
await page.waitForTimeout(200)
const box = await charts.first().boundingBox()
const clip = {
  x: 0,
  y: Math.max(0, box.y - 24),
  width: 1360,
  height: 700,
}
await page.screenshot({ path: resolve(out, 'portfolio-charts.png'), clip })

await browser.close()
console.log('docs/screenshots/portfolio-charts.png geschrieben.')
