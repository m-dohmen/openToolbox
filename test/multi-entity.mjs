// SPDX-License-Identifier: Apache-2.0
// Baut examples/suppliers-certificates.domain.js in ein eigenes dist-multi-entity/
// (dist/ selbst bleibt unberuehrt - das ist der Build fuer test/smoke.mjs) und
// prueft die Mehr-Entitaeten-Funktionen: Umschalter, Reference-Feld in Formular
// und Tabelle, Navigation per Klick, Loesch-Schutz, CSV-Export, KI-Aktion ueber
// eine Entitaetsgrenze hinweg.
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildWithDomain, pidSuffix } from './domain-swap.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const examplePath = resolve(root, 'examples/suppliers-certificates.domain.js')
// Eigene Ausgabeverzeichnisse pro Prozess, siehe test/domain-swap.mjs.
const outDir = resolve(root, 'dist-multi-entity' + pidSuffix)
const dist = resolve(outDir, 'index.html')
const tmp = resolve(root, 'test/.out')
mkdirSync(tmp, { recursive: true })

const fail = (m) => {
  console.error('FEHLER: ' + m)
  process.exitCode = 1
}

// Domain nur so kurz wie moeglich austauschen: Original sichern, Beispiel
// reinkopieren, bauen, sofort zurueckschreiben - unabhaengig vom Buildergebnis.
buildWithDomain(examplePath, 'dist-multi-entity' + pidSuffix)
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
// Port 0 statt 8898, wie im Smoke-Test: ein fester Port wuerde jeden
// gleichzeitigen zweiten Lauf mit EADDRINUSE abwerfen (OPEN-75).
await new Promise((r) => mock.listen(0, '127.0.0.1', r))
const mockBase = `http://127.0.0.1:${mock.address().port}`

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
// Seit der Startseite ist die Liste nicht mehr der Einstieg.
await page.waitForSelector('.home, table tbody tr')
if (await page.locator('.home').count()) await page.locator('.home__foot .btn--primary').click()
await page.waitForSelector('table tbody tr')

// 1) Umschalter zwischen Entitaeten
const tabs = await page.locator('.entity-tabs > button').allInnerTexts()
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

/*
 * Sortierung (OPEN-18): die Reference-Spalte sortiert nach dem aufgeloesten
 * Lieferantennamen, nicht nach der rohen Id - die Tabelle zeigt den Namen,
 * also muss der Kopf dieselbe Ordnung legen. Aufzaehlungen sortieren nach
 * ihrer Beschriftung.
 */
await page.getByRole('columnheader', { name: 'Supplier', exact: true }).click()
const chipsByTitle = await page.locator('.ref-chip').allInnerTexts()
const expectedChips = [
  'Elbe Hardware Solutions',
  'Havel Consulting Partners',
  'Nordwind IT GmbH',
  'Nordwind IT GmbH',
  'Rheinmetall Services AG',
  'Rheinmetall Services AG',
  'Spree Cloud Systems',
  'Spree Cloud Systems',
  'Spree Cloud Systems',
]
console.log('2a) Nach Supplier-Kopf sortiert:', chipsByTitle.join(' | '))
if (chipsByTitle.join('|') !== expectedChips.join('|')) {
  fail('Reference-Spalte sortiert nach Id statt nach Titel: ' + chipsByTitle.join(', '))
}

await page.getByRole('columnheader', { name: /^Type/ }).click()
const pillsByLabel = await page.locator('td .pill').allInnerTexts()
console.log('2b) Nach Type-Kopf sortiert:', pillsByLabel.join(', '))
if (pillsByLabel.join('|') !== ['ISO 27001', 'ISO 27001', 'ISO 27001', 'Other', 'Other', 'PCI-DSS', 'PCI-DSS', 'SOC 2', 'SOC 2'].join('|')) {
  fail('Aufzaehlungsspalte sortiert nicht nach Beschriftung: ' + pillsByLabel.join(', '))
}

// 3) Klick auf den Chip springt zur Suppliers-Ansicht und oeffnet den Datensatz
await page.locator('.ref-chip').first().click()
await page.waitForSelector('.drawer')
const activeTab = await page.locator('.entity-tabs > button[aria-selected="true"]').innerText()
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
// Der Fuss hat seit dem Duplizieren zwei stille Knoepfe - Abbrechen ist
// namentlich angesprochen, nicht ueber seine Klasse.
await page.getByRole('button', { name: 'Cancel' }).click()

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

// Regression: der Export durfte die aufgeloesten Titel nicht in den
// Datenbestand zurueckschreiben - danach waeren alle Chips "—".
const chipsAfterExport = await page.locator('.ref-chip').count()
console.log('   Chips nach dem CSV-Export weiterhin aufgeloest:', chipsAfterExport)
if (chipsAfterExport !== 9) fail('CSV-Export hat die Referenz-Ids in der Datei ueberschrieben')

// 7) KI-Aktion ueber Entitaetsgrenze: Modell nennt den Supplier per Name, nicht per Id
await page.getByLabel('Settings').click()
await page.waitForSelector('.settings')
await page.getByText('off', { exact: true }).click()
await page.waitForSelector('input[placeholder="https://…/openai/v1"]')
await page.locator('input[placeholder="https://…/openai/v1"]').fill(mockBase + '/v1')
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

// Gefuehrte Erfassung ueber zwei Entitaeten: der Entwurf des ersten Schritts
// muss im zweiten schon als Referenzziel auswaehlbar sein.
await page.getByRole('tab', { name: 'Guided entry' }).click()
await page.waitForSelector('.wizard')
await page.locator('#f-name').fill('Suedwind Logistik GmbH')
await page.waitForTimeout(150)
await page.locator('.wizard__foot .btn--primary').click()
await page.waitForSelector('#f-supplierId')
const refOptions = await page.locator('#f-supplierId option').allInnerTexts()
console.log('11) Referenzziele im zweiten Schritt:', refOptions.length, '| Entwurf dabei:',
  refOptions.includes('Suedwind Logistik GmbH'))
if (!refOptions.includes('Suedwind Logistik GmbH')) {
  fail('Der Entwurf aus Schritt 1 ist im Referenzfeld von Schritt 2 nicht waehlbar')
}

await page.locator('#f-title').fill('ISO 9001 certificate')
await page.locator('#f-supplierId').selectOption({ label: 'Suedwind Logistik GmbH' })
await page.locator('.wizard__foot .btn--primary').click()
await page.waitForSelector('.wizard__review')
const wizReview = await page.locator('.wizard__review').innerText()
console.log('12) Vorschau ueber beide Entitaeten:', wizReview.split('\n').filter((l) => l.includes('×')).join(' | '))
await page.locator('.wizard__foot .btn--primary').click()
await page.waitForSelector('.wizard__inner--done')

await page.locator('.wizard__foot .btn--quiet').click()
await page.getByRole('tab', { name: 'suppliers' }).click()
await page.waitForSelector('table tbody tr')
const supplierRowsAfterWizard = await page.locator('table tbody tr').count()
await page.getByRole('tab', { name: 'certificates' }).click()
const certRowsFinal = await page.locator('table tbody tr').count()
console.log('13) Nach dem Durchlauf — Suppliers:', supplierRowsAfterWizard, '| Certificates:', certRowsFinal)
if (supplierRowsAfterWizard !== 6 || certRowsFinal !== 11) fail('Wizard hat nicht in beide Entitaeten geschrieben')
const wizChip = await page.locator('tr:has-text("ISO 9001 certificate") .ref-chip').innerText()
console.log('    Aufgeloester Supplier:', wizChip)
if (wizChip !== 'Suedwind Logistik GmbH') fail('Referenz auf den im selben Durchlauf angelegten Datensatz fehlt')

/*
 * Duplizieren mit zwei Entitaeten (OPEN-20): die Kopie bleibt in ihrer
 * Entitaet, traegt die Id ihres eigenen Praefix, der Reference-Wert reist
 * mit, und ein Strg+Z nimmt sie vollstaendig zurueck.
 */
const certSourceId = await page.locator('tr:has-text("ISO 9001 certificate") .cell-id').innerText()
await page.locator('tr:has-text("ISO 9001 certificate") .cell-action button').click()

const certRowsAfterDuplicate = await page.locator('table tbody tr').count()
console.log('13a) Zertifikat dupliziert — Zeilen:', certRowsAfterDuplicate)
if (certRowsAfterDuplicate !== 12) fail('Duplizieren hat im aktiven Tab nicht gegriffen')

const certCopyRow = page.locator('tr:has-text("ISO 9001 certificate (Copy)")')
if ((await certCopyRow.count()) !== 1) fail('Zertifikats-Kopie fehlt oder liegt doppelt')
const certCopyId = await certCopyRow.locator('.cell-id').innerText()
if (!certCopyId.startsWith('C-')) fail('Kopie traegt nicht das Id-Praefix ihrer Entitaet')
if (certCopyId === certSourceId) fail('Kopie traegt dieselbe Id wie das Original')
const certCopyChip = await certCopyRow.locator('.ref-chip').innerText()
if (certCopyChip !== 'Suedwind Logistik GmbH') fail('Kopie hat den Reference-Wert nicht uebernommen')
if ((await page.locator('.drawer__head .cell-id').innerText()) !== certCopyId) {
  fail('Nach dem Duplizieren oeffnet nicht das Formular der Kopie')
}

await page.keyboard.press('Escape')
await page.keyboard.press('Control+z')
const certRowsAfterUndoDuplicate = await page.locator('table tbody tr').count()
const certCopyGone = (await page.locator('tr:has-text("ISO 9001 certificate (Copy)")').count()) === 0
console.log('13b) Duplikat rueckgaengig — Zeilen:', certRowsAfterUndoDuplicate, '| Kopie weg:', certCopyGone)
if (certRowsAfterUndoDuplicate !== 11 || !certCopyGone) fail('Strg+Z hat die Zertifikats-Kopie nicht vollstaendig entfernt')

/*
 * Mehrfachauswahl mit Sammelaktionen (OPEN-19), hier im Mehr-Entitaeten-Build:
 * Certificates hat genau ein Aufzählfeld - kein Feld-Select, nur der Wert -
 * und der Sammel-Löschversuch auf Suppliers läuft in den Referenz-Schutz:
 * alle Gewählten sind referenziert, keiner wird entfernt, alle werden benannt.
 */
await page.locator('tr:has-text("PCI-DSS attestation") .td-check input').click()
await page.locator('tr:has-text("Hardware supply ISO 27001") .td-check input').click()

const certSelects = await page.locator('.bulk-bar select').count()
if (certSelects !== 1) fail('Bei genau einem Aufzahlfeld gibt es keinen Feld-Select')
await page.locator('.bulk-bar select').selectOption('SOC 2')
await page.getByRole('button', { name: 'Set value' }).click()
await page.waitForSelector('.toast')
console.log('M1) Sammelaktion auf Certificates:', await page.locator('.toast').innerText())
const BULK_TARGETS = [
  ['PCI-DSS attestation', 'PCI-DSS'],
  ['Hardware supply ISO 27001', 'ISO 27001'],
]
for (const [title] of BULK_TARGETS) {
  const pill = (await page.locator(`tr:has-text("${title}") .pill`).innerText()).trim()
  if (pill !== 'SOC 2') fail(`"${title}" wurde nicht auf SOC 2 gesetzt`)
}
await page.keyboard.press('Control+z')
for (const [title, expected] of BULK_TARGETS) {
  const pill = (await page.locator(`tr:has-text("${title}") .pill`).innerText()).trim()
  if (pill !== expected) fail(`Ein Strg+Z hat "${title}" nicht auf ${expected} zurueckgesetzt`)
}
if (await page.locator('.bulk-bar').count()) {
  fail('Nach der abgeschlossenen Sammelaktion ist noch eine Auswahl aktiv')
}

// Referenz-Schutz beim Sammel-Loeschen: beide Suppliers sind Ziel von
// Reference-Feldern, der Löschversuch entfernt keinen einzigen.
await page.getByRole('tab', { name: 'suppliers' }).click()
await page.waitForSelector('table tbody tr')
await page.locator('tr:has-text("Nordwind IT GmbH") .td-check input').click()
await page.locator('tr:has-text("Spree Cloud Systems") .td-check input').click()
await page.getByRole('button', { name: 'Delete selected' }).click()
await page.waitForSelector('.modal')
const supplierDialogBody = await page.locator('.modal').innerText()
if (!supplierDialogBody.includes('2 records will be removed')) {
  fail('Die Rueckfrage zaehlt die ausgewählten Suppliers nicht')
}
await page.locator('.modal .btn--danger').click()
await page.waitForSelector('.toast')
const guardBulkToast = await page.locator('.toast').innerText()
const supplierRowsAfterGuard = await page.locator('table tbody tr').count()
console.log('M2) Referenz-Schutz beim Sammel-Loeschen:', guardBulkToast, '| Zeilen:', supplierRowsAfterGuard)
if (!guardBulkToast.includes('still referenced')) fail('Behaltene Datensaetze wurden nicht begruendet')
if (supplierRowsAfterGuard !== 6) fail('Der Referenz-Schutz hat beim Sammel-Loeschen versagt')
if (!(await page.locator('.bulk-bar').count())) fail('Der fehlgeschlagene Löschversuch hat die Auswahl weggeworfen')

/*
 * Faelligkeiten-Widget ueber Entitaetsgrenzen: eigener Build mit
 * test/fixtures/due-date-multi.domain.js. "projects" hat ein Datumsfeld, das
 * aber nicht als dueDate deklariert ist - das darf im Widget nirgends
 * auftauchen, auch wenn es in der Vergangenheit liegt. "milestones" deklariert
 * dueDate und traegt alle drei Gruppen; ein Klick aus dem Dashboard heraus
 * muss zur richtigen Entitaet umschalten, genau wie der Reference-Chip oben.
 */
const dueOutDir = resolve(root, 'dist-due-date-multi' + pidSuffix)
const dueDist = resolve(dueOutDir, 'index.html')
const dueMultiFixture = resolve(root, 'test/fixtures/due-date-multi.domain.js')
buildWithDomain(dueMultiFixture, 'dist-due-date-multi' + pidSuffix)
console.log('14) Faelligkeiten-Multi-Entity-Build erzeugt:', dueDist)

// Eigener Browser-Context statt der gemeinsamen `ctx`: clock.install() friert
// die Uhr fuer den ganzen Context ein, nicht nur die eine Seite.
const dueCtx = await browser.newContext({ viewport: { width: 1280, height: 850 } })
const duePage = await dueCtx.newPage()
duePage.on('pageerror', (e) => errors.push(String(e)))
await duePage.clock.install({ time: new Date(2026, 7, 17, 9) })
await duePage.goto('file://' + dueDist)
await duePage.waitForSelector('.home, table tbody tr')
if (await duePage.locator('.home').count()) await duePage.locator('.home__foot .btn--primary').click()
await duePage.waitForSelector('table tbody tr')
await duePage.getByRole('tab', { name: 'Dashboard' }).click()
await duePage.waitForSelector('.dashboard')

const dueGroupLabels = await duePage.locator('.due-widget__group-label').allInnerTexts()
console.log('15) Faelligkeiten-Gruppen ueber beide Entitaeten:', dueGroupLabels)
if (dueGroupLabels.length !== 3) fail('Erwartet alle 3 Gruppen (overdue/thisWeek/upcoming) bei der Milestones-Entitaet')

const dueItems = await duePage.locator('.due-widget__item').allInnerTexts()
console.log('    Eintraege:', dueItems)
if (dueItems.length !== 3) fail('Erwartet 3 sichtbare Eintraege - der erledigte Milestone bleibt aussen vor')
if (dueItems.some((t) => t.includes('Done milestone'))) fail('Erledigter Milestone erscheint trotzdem im Widget')
if (dueItems.some((t) => /2026-01-01/.test(t))) {
  fail('Das undeklarierte Datumsfeld von "projects" wurde trotzdem in das Widget aufgenommen')
}

// Klick aus dem Dashboard heraus muss die Entitaet wechseln, nicht nur den
// Datensatz oeffnen - defaultEntityKey ist "projects", der Eintrag gehoert
// aber zu "milestones".
await duePage.locator('.due-widget__item', { hasText: 'Kickoff overdue' }).click()
await duePage.waitForSelector('.drawer')
console.log('16) Klick auf Faelligkeits-Eintrag oeffnet:', await duePage.locator('.drawer__head h2').innerText())
await duePage.keyboard.press('Escape')
await duePage.getByRole('tab', { name: 'List' }).click()
await duePage.waitForSelector('table tbody tr')
const activeTabAfterDueClick = await duePage.locator('.entity-tabs > button[aria-selected="true"]').innerText()
console.log('    Aktive Entitaet danach:', activeTabAfterDueClick)
if (activeTabAfterDueClick.toLowerCase() !== 'milestones') {
  fail('Klick auf einen Faelligkeits-Eintrag wechselt nicht zur richtigen Entitaet')
}
await dueCtx.close()
rmSync(dueOutDir, { recursive: true, force: true })

/*
 * Globale Suche über Entitätsgrenzen (derselbe Build wie oben): der Begriff
 * trifft den Lieferantennamen und - über die aufgelösten Referenztitel -
 * dessen Zertifikate. Die Trefferzahl hängt an jedem Reiter, die Hervorhebung
 * auch im Reference-Chip. Danach die Kombination aus Suche und Datumsbereich.
 */
await page.locator('.globalsearch input[type="search"]').fill('Nordwind')
await page.waitForTimeout(150)
const supBadge = await page.locator('.entity-tabs > button', { hasText: 'suppliers' }).locator('.tabcount').innerText()
const certBadge = await page.locator('.entity-tabs > button', { hasText: 'certificates' }).locator('.tabcount').innerText()
console.log('17) Treffer je Entität für "Nordwind" — suppliers:', supBadge, '| certificates:', certBadge)
if (supBadge !== '1') fail('Die Trefferzahl am Suppliers-Reiter stimmt nicht')
if (certBadge !== '3') fail('Die Suche findet die Zertifikate nicht über den Referenztitel')
// Nicht per Rolle klicken: der zugängliche Name des Reiters trägt unter
// aktiver Suche die Trefferzahl.
await page.locator('.entity-tabs > button', { hasText: 'certificates' }).click()
await page.waitForSelector('table tbody tr')
const nordwindRows = await page.locator('table tbody tr').count()
const nordwindMarks = await page.locator('.ref-chip mark').count()
console.log('18) Zertifikatsliste unter "Nordwind":', nordwindRows, 'Zeilen | Hervorhebungen im Chip:', nordwindMarks)
if (nordwindRows !== 3) fail('Die globale Suche filtert die Zielentität nicht')
if (nordwindMarks < 1) fail('Der Treffer wird auch im Reference-Chip nicht hervorgehoben')
const expFrom = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)
await page.locator('.fieldfilter input[aria-label="Expiry date from"]').fill(expFrom)
await page.waitForTimeout(150)
const nordwindFresh = await page.locator('table tbody tr').first().locator('.cell-title').innerText()
console.log('    zuzüglich Ablauf ab', expFrom, ':', nordwindFresh.split('\n')[0])
if ((await page.locator('table tbody tr').count()) !== 1 || !nordwindFresh.includes('SOC 2')) {
  fail('Suche und Feldfilter schneiden über die Entitäten hinweg nicht korrekt')
}
await page.locator('.globalsearch input[type="search"]').fill('')
await page.waitForTimeout(150)

/*
 * Negativfall und Mehrfachauswahl: eigener Build mit einer Entität ("log"),
 * die nur ein berechnetes Feld und einen Anhang besitzt. Für sie darf weder
 * Filterbereich noch Chip erscheinen - gefunden wird sie von der globalen
 * Suche trotzdem. Die andere Entität übt die Mehrfachauswahl einer
 * Aufzählung ohne Facettengruppe und dieselben Chips.
 */
const sfOutDir = resolve(root, 'dist-search-negative' + pidSuffix)
const sfDist = resolve(sfOutDir, 'index.html')
const sfFixture = resolve(root, 'test/fixtures/search-filter-negative.domain.js')
buildWithDomain(sfFixture, 'dist-search-negative' + pidSuffix)
console.log('19) Suche/Filter-Negativ-Build erzeugt:', sfDist)

const sfPage = await ctx.newPage()
sfPage.on('pageerror', (e) => errors.push(String(e)))
await sfPage.goto('file://' + sfDist)
await sfPage.waitForSelector('.home, table tbody tr')
if (await sfPage.locator('.home').count()) await sfPage.locator('.home__foot .btn--primary').click()
await sfPage.waitForSelector('table tbody tr')

// "things" hat filterbare Typen - der Bereich ist da, ohne dass Facetten nötig wären.
const thingFilters = await sfPage.locator('.fieldfilter').count()
console.log('20) Filterfelder bei "things":', thingFilters)
if (thingFilters < 3) fail('Der Filterbereich zeigt die filterbaren Typen nicht')

// Ein Begriff, Treffer in beiden Entitäten, Zahl an jedem Reiter.
await sfPage.locator('.globalsearch input[type="search"]').fill('2026')
await sfPage.waitForTimeout(150)
const thingsBadge = await sfPage.locator('.entity-tabs > button', { hasText: 'things' }).locator('.tabcount').innerText()
const logBadge = await sfPage.locator('.entity-tabs > button', { hasText: 'log entries' }).locator('.tabcount').innerText()
console.log('21) Treffer für "2026" — things:', thingsBadge, '| log entries:', logBadge)
if (thingsBadge !== '2' || logBadge !== '1') fail('Trefferzahlen je Entität stimmen nicht (auch das berechnete Feld muss treffen)')

// Negativfall: keine filterbaren Typen, keine Filterfläche, keine Chips.
await sfPage.locator('.entity-tabs > button', { hasText: 'log entries' }).click()
await sfPage.waitForSelector('table tbody tr')
const logRows = await sfPage.locator('table tbody tr').count()
const logFilters = await sfPage.locator('.fieldfilter').count()
const logChips = await sfPage.locator('.chips--filters .chip').count()
console.log('22) "log entries" unter aktiver Suche:', logRows, 'Zeilen | Filterfelder:', logFilters, '| Chips:', logChips)
if (logRows !== 1) fail('Der Datensatz der typlosen Entität wurde von der Suche nicht gefunden')
if (logFilters !== 0) fail('Eine Entität ohne passende Feldtypen bekam doch einen Filterbereich')
if (logChips !== 0) fail('Eine Entität ohne passende Feldtypen bekam doch Filter-Chips')

// Mehrfachauswahl an der Aufzählung ohne Facette, als Chip entfernbare,
// kombiniert mit der laufenden Suche.
await sfPage.locator('.entity-tabs > button', { hasText: 'things' }).click()
await sfPage.waitForSelector('table tbody tr')
await sfPage.locator('.fieldfilter .filter button', { hasText: 'blue' }).click()
await sfPage.waitForTimeout(150)
const blueRows = await sfPage.locator('table tbody tr').count()
console.log('23) Mehrfachauswahl "blue":', blueRows, 'Zeilen | Chip:', await sfPage.locator('.chips--filters .chip em').innerText())
if (blueRows !== 1) fail('Die Mehrfachauswahl schneidet nicht korrekt')
await sfPage.locator('.globalsearch input[type="search"]').fill('alpha')
await sfPage.waitForTimeout(150)
if ((await sfPage.locator('table tbody tr').count()) !== 0) fail('Suche und Filter schließen den letzten Treffer nicht aus')
if (!(await sfPage.locator('.empty').count())) fail('Der Leerzustand erscheint nicht')
await sfPage.locator('.globalsearch input[type="search"]').fill('')
await sfPage.waitForTimeout(150)
if ((await sfPage.locator('table tbody tr').count()) !== 1) fail('Ohne Suchbegriff bleibt der Auswahlfilter nicht allein übrig')
await sfPage.locator('.chips--filters .chip button').click()
await sfPage.waitForTimeout(150)
if ((await sfPage.locator('table tbody tr').count()) !== 2) fail('Chip entfernt den Auswahlfilter nicht')

// Nur Sitzungsspeicher: nach dem Neuladen ist alles weg.
await sfPage.reload()
await sfPage.waitForSelector('.home, table tbody tr')
if (await sfPage.locator('.home').count()) await sfPage.locator('.home__foot .btn--primary').click()
await sfPage.waitForSelector('table tbody tr')
const reloadedThings = await sfPage.locator('table tbody tr').count()
const reloadedQuery = await sfPage.locator('.globalsearch input[type="search"]').inputValue()
console.log('24) Nach Neuladen:', reloadedThings, 'Zeilen | Suchfeld:', JSON.stringify(reloadedQuery))
if (reloadedThings !== 2 || reloadedQuery !== '') fail('Filter-/Suchzustand überlebte das Neuladen - er gehört nur in die Sitzung')
await sfPage.close()
rmSync(sfOutDir, { recursive: true, force: true })

/*
 * Kennzahlen-Kacheln ueber Entitaetsgrenzen: eigener Build mit
 * test/fixtures/metrics-multi.domain.js. Nur "certificates" deklariert
 * metrics - "suppliers" bringt keine hervor, auch wenn es die gerade offene
 * Entitaet ist. Der Klick auf eine Kachel muss zur Liste der deklarierenden
 * Entitaet springen, nicht zu der, die zuletzt aktiv war.
 */
const metricsOutDir = resolve(root, 'dist-metrics-multi' + pidSuffix)
const metricsDist = resolve(metricsOutDir, 'index.html')
const metricsFixture = resolve(root, 'test/fixtures/metrics-multi.domain.js')
buildWithDomain(metricsFixture, 'dist-metrics-multi' + pidSuffix)
console.log('25) Kennzahlen-Multi-Entity-Build erzeugt:', metricsDist)

const metricsCtx = await browser.newContext({ viewport: { width: 1280, height: 850 } })
const metricsPage = await metricsCtx.newPage()
metricsPage.on('pageerror', (e) => errors.push(String(e)))
await metricsPage.goto('file://' + metricsDist)
await metricsPage.waitForSelector('.home, table tbody tr')
if (await metricsPage.locator('.home').count()) await metricsPage.locator('.home__foot .btn--primary').click()
await metricsPage.waitForSelector('table tbody tr')
// Aktive Entitaet ist suppliers - die Kacheln gehoeren trotzdem zu certificates.
await metricsPage.getByRole('tab', { name: 'Dashboard' }).click()
await metricsPage.waitForSelector('.dashboard')

const metricLabels = await metricsPage.locator('.tile--metric .tile__label').allTextContents()
const metricValues = await metricsPage.locator('.tile--metric .tile__value').allInnerTexts()
console.log('26) Kennzahl-Kacheln:', metricLabels.join(' | '), '—', metricValues.join(' | '))
if (metricLabels.length !== 2) fail('Erwartet 2 Kacheln - suppliers deklariert keine, ein Default darf keine nachziehen')
if (metricLabels[0] !== 'certificates') fail('count ohne Label tritt nicht auf den Plural zurueck')
if (metricValues[0] !== '3') fail(`Anzahl-Kachel zaehlt ${metricValues[0]} statt 3`)
if (metricValues[1] !== '400') fail(`Summen-Kachel rechnet ${metricValues[1]} statt 400 (100+250+50)`)

// Klick aus der suppliers-Sicht: die Kachel kennt ihre Entitaet und schaltet um.
// hasText mit Regex - das Label steht per CSS in Grossbuchstaben.
await metricsPage.locator('.tile--metric', { hasText: /Certified volume/i }).click()
await metricsPage.waitForSelector('table tbody tr')
const activeAfterMetricClick = await metricsPage.locator('.entity-tabs > button[aria-selected="true"]').innerText()
console.log('27) Nach Klick auf Kachel aktive Entitaet:', activeAfterMetricClick)
if (activeAfterMetricClick.toLowerCase() !== 'certificates') {
  fail('Klick auf eine Kachel wechselt nicht zur Liste ihrer Entitaet')
}
await metricsCtx.close()
rmSync(metricsOutDir, { recursive: true, force: true })

/*
 * JSON-Import ueber Entitaetsgrenzen ({ records: { <entity>: [...] } }):
 * dieselbe Pruefung wie beim CSV-Import - eine Referenz, die keinen
 * Bestandsdatensatz aufloest, lehnt die GANZE Datei ab. Eine saubere Datei
 * ersetzt die Datensaetze der genannten Entitaeten und loest Referenzen per
 * Titel auf.
 */
const jsonPage = await ctx.newPage()
jsonPage.on('pageerror', (e) => errors.push(String(e)))
await jsonPage.goto('file://' + dist)
await jsonPage.waitForSelector('.home, table tbody tr')
if (await jsonPage.locator('.home').count()) await jsonPage.locator('.home__foot .btn--primary').click()
await jsonPage.waitForSelector('table tbody tr')

await jsonPage.evaluate(() => {
  const original = HTMLInputElement.prototype.click
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { window.__jsonPicker = this; return }
    return original.call(this)
  }
})
await jsonPage.getByText('Import JSON', { exact: true }).click()
await jsonPage.waitForFunction(() => window.__jsonPicker)
// pickFile erzeugt je Aufruf ein neues Input-Element - der Handle wird vor
// jeder Dateiuebergabe frisch aufgeloest.
const pickJson = async (path) => {
  await jsonPage.getByText('Import JSON', { exact: true }).click()
  await jsonPage.waitForFunction(() => window.__jsonPicker)
  const handle = await jsonPage.evaluateHandle(() => window.__jsonPicker)
  await handle.asElement().setInputFiles(path)
}

const badCertJson = resolve(tmp, 'zertifikate-kaputt.json')
writeFileSync(
  badCertJson,
  JSON.stringify({
    records: {
      certificates: [
        { id: 'C-90', title: 'Broken cert', supplierId: 'Ghost supplier', type: 'ISO 27001', expiry: '2027-02-01' },
      ],
    },
  }),
)
// Bestand unangetastet: der Zertifikats-Reiter zeigt vor und nach der
// Ablehnung dieselbe Zahl.
await jsonPage.locator('.entity-tabs > button', { hasText: 'certificates' }).click()
await jsonPage.waitForSelector('table tbody tr')
const certsBeforeReject = await jsonPage.locator('table tbody tr').count()
await pickJson(badCertJson)
await jsonPage.waitForSelector('.toast--error', { timeout: 5000 })
console.log('28) JSON-Map-Import abgelehnt:', await jsonPage.locator('.toast--error').innerText())
if ((await jsonPage.locator('table tbody tr').count()) !== certsBeforeReject) {
  fail('Die abgelehnte JSON-Datei hat den Zertifikatsbestand veraendert')
}

const okCertJson = resolve(tmp, 'zertifikate-sauber.json')
writeFileSync(
  okCertJson,
  JSON.stringify({
    records: {
      certificates: [
        { id: 'C-91', title: 'Imported via JSON', supplierId: 'Nordwind IT GmbH', type: 'ISO 27001', expiry: '2027-03-01' },
      ],
    },
  }),
)
await pickJson(okCertJson)
await jsonPage.waitForTimeout(300)
const jsonCertRows = await jsonPage.locator('table tbody tr').count()
const certRowText = jsonCertRows ? await jsonPage.locator('table tbody tr').first().innerText() : ''
console.log('    sauber importiert:', jsonCertRows, 'Zeile |', certRowText.replace(/\s+/g, ' '))
if (jsonCertRows !== 1) fail('Der Map-Import hat die Entitaet nicht vollstaendig ersetzt (1 erwartet)')
if (!certRowText.includes('Nordwind IT GmbH')) fail('Die Referenz wurde beim JSON-Import nicht per Titel aufgeloest')
await jsonPage.close()

console.log(errors.length ? '\nKonsolenfehler:\n' + errors.join('\n') : '\nKeine Konsolenfehler.')
await browser.close()
mock.close()
rmSync(outDir, { recursive: true, force: true })
