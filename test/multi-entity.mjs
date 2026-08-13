// SPDX-License-Identifier: Apache-2.0
// Baut examples/suppliers-certificates.domain.js in ein eigenes dist-multi-entity/
// (dist/ selbst bleibt unberuehrt - das ist der Build fuer test/smoke.mjs) und
// prueft die Mehr-Entitaeten-Funktionen: Umschalter, Reference-Feld in Formular
// und Tabelle, Navigation per Klick, Loesch-Schutz, CSV-Export, KI-Aktion ueber
// eine Entitaetsgrenze hinweg.
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const domainPath = resolve(root, 'src/domain.js')
const examplePath = resolve(root, 'examples/suppliers-certificates.domain.js')
const outDir = resolve(root, 'dist-multi-entity')
const dist = resolve(outDir, 'index.html')
const tmp = resolve(root, 'test/.out')
mkdirSync(tmp, { recursive: true })

const fail = (m) => {
  console.error('FEHLER: ' + m)
  process.exitCode = 1
}

// Domain nur so kurz wie moeglich austauschen: Original sichern, Beispiel
// reinkopieren, bauen, sofort zurueckschreiben - unabhaengig vom Buildergebnis.
const originalDomain = readFileSync(domainPath, 'utf8')
writeFileSync(domainPath, readFileSync(examplePath, 'utf8'))
try {
  execFileSync('npx', ['vite', 'build', '--outDir', 'dist-multi-entity'], { cwd: root, stdio: 'pipe' })
} finally {
  writeFileSync(domainPath, originalDomain)
}
console.log('0) Multi-Entity-Build erzeugt:', dist)

const seen = []
const mock = createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization, api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    return res.end()
  }
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    const body = JSON.parse(raw || '{}')
    seen.push({ body })
    const content =
      'I will create a certificate for that supplier.\n\n```aktionen\n' +
      JSON.stringify([
        {
          op: 'create',
          entity: 'certificates',
          record: { title: 'New audit certificate', supplierId: 'Nordwind IT GmbH', type: 'ISO 27001' },
        },
      ]) +
      '\n```'
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }))
  })
})
await new Promise((r) => mock.listen(8898, '127.0.0.1', r))

const browser = await chromium.launch()
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 850 } })
await ctx.addInitScript(() => {
  delete window.showSaveFilePicker
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto('file://' + dist)
await page.waitForSelector('table tbody tr')

// 1) Umschalter zwischen Entitaeten
const tabs = await page.locator('.entity-tabs button').allInnerTexts()
console.log('1) Entity-Tabs:', tabs)
if (tabs.length !== 2) fail('Erwartet 2 Entity-Tabs (suppliers, certificates)')

const supplierRows = await page.locator('table tbody tr').count()
console.log('   Suppliers Zeilen:', supplierRows)
if (supplierRows !== 5) fail('Erwartet 5 Suppliers')

await page.getByRole('tab', { name: 'certificates' }).click()
await page.waitForSelector('table tbody tr')
const certRows = await page.locator('table tbody tr').count()
console.log('2) Certificates Zeilen:', certRows)
if (certRows !== 9) fail('Erwartet 9 Certificates')

// 2) Reference-Chip in der Tabelle zeigt den aufgeloesten Titel, nicht die Id
const firstChip = await page.locator('.ref-chip').first().innerText()
console.log('3) Erster Reference-Chip:', firstChip)
if (/^S-\d/.test(firstChip)) fail('Reference-Chip zeigt rohe Id statt Titel')

// 3) Klick auf den Chip springt zur Suppliers-Ansicht und oeffnet den Datensatz
await page.locator('.ref-chip').first().click()
await page.waitForSelector('.drawer')
const activeTab = await page.locator('.entity-tabs button[aria-selected="true"]').innerText()
console.log('4) Nach Klick aktiver Tab:', activeTab, '| Drawer-Titel:', await page.locator('.drawer__head h2').innerText())
if (activeTab.toLowerCase() !== 'suppliers') fail('Klick auf Reference-Chip navigiert nicht zur Zielentitaet')

// 4) Loesch-Schutz: dieser Supplier wird von mindestens einem Certificate referenziert
await page.locator('.drawer__foot .btn--danger').click()
await page.locator('.drawer__foot .btn--danger').click()
await page.waitForSelector('.toast')
const guardToast = await page.locator('.toast').innerText()
console.log('5) Loesch-Schutz-Meldung:', guardToast)
if (!guardToast.includes("Can't delete")) fail('Loesch-Schutz griff nicht wie erwartet')
const suppliersStill = await page.locator('.drawer').count()
if (suppliersStill !== 1) fail('Drawer wurde trotz Lösch-Schutz geschlossen')
await page.locator('.drawer__foot .btn--quiet').click()

// 5) Reference-Feld im Formular: Select mit dem Titel-Feld der Zielentitaet
// Klick gezielt auf die Id-Zelle, nicht auf die Zeilenmitte - die faellt bei
// dieser Spaltenbreite sonst auf den Reference-Chip in der Supplier-Spalte
// und wuerde per stopPropagation zur falschen Entitaet navigieren.
await page.getByRole('tab', { name: 'certificates' }).click()
await page.waitForSelector('table tbody tr')
await page.locator('table tbody tr').first().locator('.cell-id').click()
await page.waitForSelector('.drawer')
const supplierOptions = await page.locator('#f-supplierId option').allInnerTexts()
console.log('6) Supplier-Optionen im Reference-Select:', supplierOptions.filter(Boolean).length)
if (!supplierOptions.includes('Nordwind IT GmbH')) fail('Reference-Select zeigt nicht die Supplier-Namen')
await page.keyboard.press('Escape')

// 6) CSV-Export: Referenz wird als Name exportiert, nicht als Id
const dl = await Promise.all([
  page.waitForEvent('download'),
  page.getByText('CSV for Excel').click(),
]).then(([d]) => d)
const csvPath = resolve(tmp, 'certificates.csv')
await dl.saveAs(csvPath)
const csv = readFileSync(csvPath, 'utf8')
console.log('7) CSV enthaelt Supplier-Namen statt Id:', csv.includes('Nordwind IT GmbH'), '| rohe Id vorhanden:', /S-00\d;/.test(csv))
if (!csv.includes('Nordwind IT GmbH')) fail('CSV-Export loest Reference-Feld nicht auf')

// 7) KI-Aktion ueber Entitaetsgrenze: Modell nennt den Supplier per Name, nicht per Id
await page.getByLabel('Settings').click()
await page.waitForSelector('.settings')
await page.getByText('off', { exact: true }).click()
await page.waitForSelector('input[placeholder="https://…/openai/v1"]')
await page.locator('input[placeholder="https://…/openai/v1"]').fill('http://127.0.0.1:8898/v1')
await page.locator('input[placeholder="gpt-4o-mini"]').fill('mock-model')
await page.locator('input[type="password"]').fill('test-key')
await page.getByRole('button', { name: 'Back to the list' }).click()
await page.waitForSelector('.chat__bar')
await page.locator('.chat__bar').click()
await page.locator('.chat__input textarea').fill('Add a new ISO 27001 certificate for Nordwind IT GmbH.')
await page.getByRole('button', { name: 'Send' }).click()
await page.waitForSelector('.proposal', { timeout: 10000 })
const proposalText = await page.locator('.proposal li').allInnerTexts()
console.log('8) KI-Vorschlag:', proposalText)
await page.getByRole('button', { name: 'Apply' }).click()
await page.waitForSelector('.proposal--done')
const outcome = await page.locator('.proposal--done p').allInnerTexts()
console.log('9) Ergebnis:', outcome)
if (!outcome.some((t) => t.includes('New audit certificate'))) fail('KI-Aktion ueber Entitaetsgrenze hinweg fehlgeschlagen')

await page.locator('.chat__bar').click()
await page.getByRole('tab', { name: 'certificates' }).click()
const certRowsAfter = await page.locator('table tbody tr').count()
console.log('10) Certificates nach KI-Aktion:', certRowsAfter)
if (certRowsAfter !== 10) fail('Neuer Datensatz per KI-Aktion nicht angelegt')
const newRowChip = await page.locator('tr:has-text("New audit certificate") .ref-chip').innerText()
console.log('    Aufgeloester Supplier des neuen Datensatzes:', newRowChip)
if (newRowChip !== 'Nordwind IT GmbH') fail('Reference per Titel-Text wurde nicht korrekt aufgeloest')

console.log(errors.length ? '\nKonsolenfehler:\n' + errors.join('\n') : '\nKeine Konsolenfehler.')
await browser.close()
mock.close()
rmSync(outDir, { recursive: true, force: true })
