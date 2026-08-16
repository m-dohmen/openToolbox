// SPDX-License-Identifier: Apache-2.0
/**
 * Erzeugt die Bilder für README und Wiki aus der gebauten Schaudemo.
 *
 *   npm run build:demo && npm run screenshots
 *
 * Bewusst skriptgesteuert statt von Hand abfotografiert: die Bilder veralten
 * sonst still, sobald sich die Oberfläche ändert. Wer die Optik anfasst, lässt
 * das hier einmal laufen und committet die neuen Bilder mit.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const demo = resolve(root, 'docs/demo/index.html')
const out = resolve(root, 'docs/screenshots')
mkdirSync(out, { recursive: true })

const shot = (page, name, opts = {}) =>
  page.screenshot({ path: resolve(out, `${name}.png`), ...opts })

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1360, height: 860 },
  deviceScaleFactor: 2, // schärfer auf Retina und in der GitHub-Ansicht
  acceptDownloads: true,
})
await ctx.addInitScript(() => {
  delete window.showSaveFilePicker
})
const page = await ctx.newPage()

const openDemo = async () => {
  await page.goto('file://' + demo)
  await page.waitForSelector('table tbody tr')
  await page.waitForTimeout(250)
}

const setPrompts = async (on) => {
  await page.getByLabel('Settings').click()
  await page.waitForSelector('.settings')
  const label = on ? 'hidden' : 'shown'
  const toggle = page.getByText(label, { exact: true })
  if (await toggle.count()) await toggle.click()
  await page.getByRole('button', { name: 'Back to the list' }).click()
  await page.waitForSelector('table tbody tr')
  await page.waitForTimeout(200)
}

await openDemo()

/* Die Übersichtsbilder ohne Hinweiskästen - die haben ihr eigenes Bild. */
await setPrompts(false)

await shot(page, 'list')

await page.getByRole('tab', { name: 'Dashboard' }).click()
await page.waitForSelector('.dashboard')
await page.waitForTimeout(250)
await shot(page, 'dashboard')

await page.getByRole('tab', { name: 'List' }).click()
await page.getByRole('tab', { name: 'milestones' }).click()
await page.waitForSelector('table tbody tr')
await page.waitForTimeout(200)
await shot(page, 'entities')

await page.locator('table tbody tr').first().locator('.cell-id').click()
await page.waitForSelector('.drawer')
await page.waitForTimeout(250)
await shot(page, 'record')
await page.keyboard.press('Escape')

/* Eine Regel, die zuschlaegt: Meilenstein in Arbeit, aber ohne
   Verantwortlichen. Der Klick auf Uebernehmen deckt die Beanstandung auf. */
await page.getByRole('tab', { name: 'Milestones' }).click()
await page.waitForSelector('table tbody tr')
await page.getByRole('button', { name: /^New / }).click()
await page.waitForSelector('.drawer')
await page.locator('#f-title').fill('Hand over the reporting workstream')
await page.locator('#f-status').selectOption('in progress')
await page.locator('.drawer__foot .btn--primary').click()
await page.waitForSelector('.field__objection')
await page.waitForTimeout(200)
await shot(page, 'validation')
await page.keyboard.press('Escape')
await page.getByRole('tab', { name: 'Projects' }).click()
await page.waitForSelector('table tbody tr')

/* Gefuehrte Erfassung: der zweite Schritt, weil dort das Referenzfeld schon
   den Entwurf aus dem ersten anbietet - der Punkt der ganzen Sache. */
await page.getByRole('tab', { name: 'Guided entry' }).click()
await page.waitForSelector('.wizard')
await page.locator('#f-name').fill('Treasury reporting programme')
await page.locator('#f-client').fill('Landesbank Sued')
await page.locator('#f-lead').fill('M. Voss')
await page.locator('#f-phase').selectOption('Delivery')
await page.waitForTimeout(150)
await page.locator('.wizard__foot .btn--primary').click()
await page.waitForSelector('#f-supplierId, #f-projectId')
await page.locator('#f-title').fill('Target architecture signed off')
await page.locator('#f-projectId').selectOption({ label: 'Treasury reporting programme' })
await page.waitForTimeout(250)
await shot(page, 'wizard')
await page.getByRole('tab', { name: 'List' }).click()
await page.waitForSelector('table tbody tr')

/* Dunkelmodus auf dem Dashboard - dort ist der Unterschied am deutlichsten. */
await page.getByLabel('Settings').click()
await page.waitForSelector('.settings')
await page.getByRole('button', { name: 'Dark', exact: true }).click()
await page.getByRole('button', { name: 'Back to the list' }).click()
await page.getByRole('tab', { name: 'Dashboard' }).click()
await page.waitForSelector('.dashboard')
await page.waitForTimeout(250)
await shot(page, 'dashboard-dark')

/* Zurück auf hell, dann die Hinweiskästen zeigen. */
await page.getByLabel('Settings').click()
await page.getByRole('button', { name: 'Light', exact: true }).click()
await page.getByRole('button', { name: 'Back to the list' }).click()
await page.waitForSelector('table tbody tr')
await setPrompts(true)
await page.waitForTimeout(200)
await shot(page, 'example-prompts')

/* Einstellungen, ganze Seite. */
await page.getByLabel('Settings').click()
await page.waitForSelector('.settings')
await page.waitForTimeout(250)
await shot(page, 'settings', { fullPage: true })

/* Dieselbe Seite gesperrt: die Felder bleiben sichtbar und lesbar, nur eben
   nicht bedienbar - genau das soll das Bild zeigen. */
await page.locator('.setting', { hasText: 'Protect settings' }).getByRole('button').first().click()
await page.waitForSelector('#lock-word')
await page.locator('#lock-word').fill('kickoff')
await page.locator('.modal__foot .btn--primary').click()
await page.waitForSelector('.settings__locked')
// Ganz nach oben: der Hinweisbalken mit dem Entsperren-Knopf ist das Neue am
// Bild, die ausgegrauten Felder darunter erklaeren sich dann von selbst.
await page.locator('.settings').evaluate((el) => el.scrollTo(0, 0))
await page.waitForTimeout(400)
await shot(page, 'settings-locked')

/* Wieder aufschliessen und den Schutz entfernen, damit die folgenden Bilder
   und die gespeicherte Demo-Datei davon nichts mitbekommen. */
await page.locator('.settings__locked .btn').click()
await page.waitForSelector('#lock-word')
await page.locator('#lock-word').fill('kickoff')
await page.locator('.modal__foot .btn--primary').click()
await page.waitForSelector('.settings__locked', { state: 'detached' })
await page.locator('.setting', { hasText: 'Protect settings' }).getByRole('button', { name: 'Remove protection' }).click()

await page.getByRole('button', { name: 'Back to the list' }).click()
await page.waitForSelector('table tbody tr')

/* Speichern-Dialog mit Notiz und Version. */
await page.locator('.filebar__save').click()
await page.waitForSelector('#log-note')
await page.locator('#log-note').fill('Budget for the reporting overhaul topped up after the steering committee')
await page.waitForTimeout(200)
await shot(page, 'save-dialog')
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 15000 }),
  page.locator('.modal__foot .btn--primary').click(),
])
await download.saveAs(resolve(root, 'test/.out/shot-demo.html'))

await page.getByRole('tab', { name: 'Change log' }).click()
await page.waitForSelector('.logview__inner')
await page.waitForTimeout(200)
await shot(page, 'change-log')

/* CSV-Zuordnung. */
await page.getByRole('tab', { name: 'List' }).click()
await page.waitForSelector('table tbody tr')
const csv = resolve(root, 'test/.out/shot-import.csv')
const { writeFileSync } = await import('node:fs')
writeFileSync(
  csv,
  'Project;Client;Engagement lead;Phase;Risk;Budget in kEUR;Laufzeitende\r\n' +
    'Treasury reporting;Landesbank Sued;M. Voss;Initiation;medium;540;2027-03-31\r\n' +
    'Branch network review;Sparkasse Rheinland;S. Behrens;Delivery;low;280;2026-12-15\r\n',
)
await page.evaluate(() => {
  const original = HTMLInputElement.prototype.click
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { window.__picker = this; return }
    return original.call(this)
  }
})
await page.getByText('Import CSV', { exact: true }).click()
await page.waitForFunction(() => window.__picker)
const handle = await page.evaluateHandle(() => window.__picker)
await handle.asElement().setInputFiles(csv)
await page.waitForSelector('.import__map')
await page.waitForTimeout(250)
await shot(page, 'csv-import')

/* Mobil. */
await page.keyboard.press('Escape')
await page.setViewportSize({ width: 420, height: 880 })
await page.waitForTimeout(400)
await shot(page, 'mobile')

await browser.close()
console.log('Screenshots written to docs/screenshots/')
