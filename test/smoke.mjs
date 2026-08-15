// SPDX-License-Identifier: Apache-2.0
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { buildUrl, parseHeaders } from '../src/lib/ai.js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist/index.html')
const tmp = resolve(root, 'test/.out')
mkdirSync(tmp, { recursive: true })

const fail = (m) => {
  console.error('FEHLER: ' + m)
  process.exitCode = 1
}

// Test-Logo mit absichtlich unsauberem Markup, um den SVG-Sanitiser zu pruefen.
const logoFixture = resolve(tmp, 'logo.svg')
writeFileSync(
  logoFixture,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" onload="evil()">' +
    '<script>alert(1)</script>' +
    '<rect width="100" height="40" fill="#0e7c86" onclick="evil()" />' +
    '</svg>',
)

/* Nachgebauter OpenAI-kompatibler Endpunkt. Prueft nebenbei, ob ein Aufruf
   aus einer lokalen Datei ueberhaupt durchgeht - die Herkunft ist dabei "null". */
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
    seen.push({ url: req.url, headers: req.headers, body })

    // Verhaelt sich wie ein aktuelles Reasoning-Modell: lehnt erst
    // max_tokens ab, dann eine abweichende Temperatur.
    const reject = (message, param, code) => {
      res.writeHead(400, { ...cors, 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message, type: 'invalid_request_error', param, code } }))
    }
    if ('max_tokens' in body) {
      return reject(
        "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.",
        'max_tokens',
        'unsupported_parameter',
      )
    }
    if ('temperature' in body) {
      return reject(
        "Unsupported value: 'temperature' does not support 0.2 with this model. Only the default (1) value is supported.",
        'temperature',
        'unsupported_value',
      )
    }

    const lastUser = [...(body.messages ?? [])].reverse().find((m) => m.role === 'user')
    let content = 'Drei Punkte sind ueberfaellig.'

    // Auf eine ausdrueckliche Anweisung hin schlaegt das Modell Aenderungen vor.
    // Eine davon ist absichtlich ungueltig, damit die Pruefung sichtbar wird.
    if (/done/i.test(lastUser?.content ?? '')) {
      content =
        'Ich schlage drei Aenderungen vor.\n\n```aktionen\n' +
        JSON.stringify([
          { op: 'update', id: 'A-1041', changes: { status: 'done' } },
          { op: 'update', id: 'A-1043', changes: { status: 'finished' } },
          { op: 'create', record: { title: 'Taken from attachment', area: 'Quality', aufwand: 2 } },
        ]) +
        '\n```'
    }

    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }))
  })
})
await new Promise((r) => mock.listen(8899, '127.0.0.1', r))

// Pfadaufbau: die haeufigste Fehlerquelle beim Einrichten
const urlCases = [
  ['https://api.openai.com/v1', false, 'https://api.openai.com/v1/chat/completions'],
  ['https://api.openai.com/v1/', false, 'https://api.openai.com/v1/chat/completions'],
  ['https://proxy.intern/llm', true, 'https://proxy.intern/llm/v1/chat/completions'],
  ['https://x.openai.azure.com/openai/deployments/gpt/chat/completions?api-version=2024-10-21', false,
   'https://x.openai.azure.com/openai/deployments/gpt/chat/completions?api-version=2024-10-21'],
  ['https://gw.intern/openai?api-version=2025-01-01', false, 'https://gw.intern/openai/chat/completions?api-version=2025-01-01'],
  ['http://localhost:11434/v1', false, 'http://localhost:11434/v1/chat/completions'],
]
let urlOk = 0
for (const [input, v1, expected] of urlCases) {
  const got = buildUrl(input, v1)
  if (got === expected) urlOk++
  else fail(`URL-Aufbau: ${input} -> ${got}, erwartet ${expected}`)
}
console.log(`0) Pfadaufbau: ${urlOk}/${urlCases.length} Faelle korrekt`)
const hdr = parseHeaders('x-gw: abc\nBroken\n api-version : 2024-10-21 ')
console.log('   Kopfzeilen:', JSON.stringify(hdr))
if (hdr['x-gw'] !== 'abc' || hdr['api-version'] !== '2024-10-21') fail('Kopfzeilen falsch geparst')

const browser = await chromium.launch()
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 850 } })
// Headless kennt keinen nativen Dateidialog -> Download-Pfad erzwingen.
await ctx.addInitScript(() => {
  delete window.showSaveFilePicker
})

const page = await ctx.newPage()

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto('file://' + dist)
await page.waitForSelector('table tbody tr', { timeout: 5000 })

const rows = await page.locator('table tbody tr').count()
console.log('1) Start über file:// — Zeilen gerendert:', rows)
if (rows !== 11) fail('erwartet 11 Zeilen')
console.log('   isSecureContext:', await page.evaluate(() => window.isSecureContext))
console.log('   crypto.subtle:', await page.evaluate(() => typeof crypto?.subtle?.deriveKey))

// Berechnetes Feld: wird gerechnet statt gespeichert, ist sortierbar, und im
// Formular schreibgeschuetzt statt ein Eingabefeld.
const computedCells = await page
  .locator('table tbody tr td.cell-computed')
  .allInnerTexts()
console.log('1a) Berechnete Spalte:', computedCells.join(' '))
if (computedCells.length !== 11) fail('Berechnete Spalte fehlt in der Tabelle')
if (!computedCells.some((t) => t.startsWith('-'))) fail('Ueberfaellige Eintraege ohne negative Restlaufzeit')
if (!computedCells.some((t) => t === '—')) fail('Erledigte Eintraege sollten keine Restlaufzeit zeigen')

await page.getByRole('columnheader', { name: /Left/ }).click()
const sortedComputed = (await page.locator('table tbody tr td.cell-computed').allInnerTexts())
  .filter((t) => t !== '—')
  .map(Number)
const ascending = sortedComputed.every((n, i, a) => i === 0 || a[i - 1] <= n)
console.log('1b) Nach berechneter Spalte sortiert:', sortedComputed.join(' '), '| aufsteigend:', ascending)
if (!ascending) fail('Sortierung nach berechnetem Feld ist nicht numerisch')

await page.locator('table tbody tr').first().locator('.cell-id').click()
await page.waitForSelector('.drawer')
const computedControl = await page.locator('#f-daysLeft').evaluate((el) => el.tagName)
console.log('1c) Berechnetes Feld im Formular als:', computedControl)
if (computedControl !== 'OUTPUT') fail('Berechnetes Feld ist im Formular beschreibbar')
await page.keyboard.press('Escape')

// Neuen Datensatz anlegen
await page.getByRole('button', { name: 'New action item' }).first().click()
await page.locator('#f-title').fill('Smoke test entry')
await page.locator('#f-owner').fill('QA')
await page.locator('#f-due').fill('2026-12-01')
await page.getByRole('button', { name: 'Apply' }).click()
const rows2 = await page.locator('table tbody tr').count()
console.log('2) Datensatz angelegt — Zeilen:', rows2)
if (rows2 !== 12) fail('Anlegen hat nicht gegriffen')

// Speichern (ohne File System Access API -> Download-Pfad)
const dl = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.locator('.filebar__save').click(),
]).then(([d]) => d)
const saved = resolve(tmp, 'runde1.html')
await dl.saveAs(saved)
const size = readFileSync(saved).length
console.log('3) Datei geschrieben:', dl.suggestedFilename(), size, 'Bytes')

// Die eigentliche Zusage berechneter Felder: sie landen nie im Datenbestand.
// Stuenden sie drin, waeren sie in dem Moment veraltet, in dem sich eine ihrer
// Quellen aendert - und niemand wuerde es merken.
const savedPayload = readFileSync(saved, 'utf8').match(
  /<script id="sb-payload"[^>]*>([\s\S]*?)<\/script>/,
)[1]
console.log('3a) "daysLeft" im gespeicherten Datenblock:', (savedPayload.match(/daysLeft/g) ?? []).length, 'mal')
if (savedPayload.includes('daysLeft')) fail('Berechnetes Feld wurde in die Datei geschrieben')

// Wiederöffnen: kommt der Datenstand zurück?
const page2 = await ctx.newPage()
page2.on('pageerror', (e) => errors.push(String(e)))
await page2.goto('file://' + saved)
await page2.waitForSelector('table tbody tr')
const rows3 = await page2.locator('table tbody tr').count()
const hasTest = await page2.getByText('Smoke test entry').count()
console.log('4) Neu geöffnet — Zeilen:', rows3, '| Testeintrag gefunden:', hasTest === 1)
if (rows3 !== 12 || hasTest !== 1) fail('Datenstand kam nicht zurück')

// Verschlüsseln und erneut speichern
await page2.getByLabel('Settings').click()
await page2.waitForSelector('.settings')
await page2.getByRole('button', { name: 'Encrypt' }).click()

// Schwache Passphrase: Hinweis ja, Blockade nein
await page2.locator('#k1').fill('abc')
await page2.locator('#k2').fill('abc')
await page2.waitForSelector('.strength--weak')
console.log('4a) Hinweis bei schwacher Passphrase:', (await page2.locator('.strength').innerText()).slice(0, 48))
if (await page2.getByRole('button', { name: 'Apply' }).isDisabled()) {
  fail('Schwache Passphrase wird blockiert statt nur bemängelt')
}

await page2.locator('#k1').fill('korrekt-pferd-batterie')
await page2.locator('#k2').fill('korrekt-pferd-batterie')
await page2.getByRole('button', { name: 'Apply' }).click()
const dl2 = await Promise.all([
  page2.waitForEvent('download', { timeout: 15000 }),
  page2.locator('.filebar__save').click(),
]).then(([d]) => d)
const sealed = resolve(tmp, 'runde2-verschluesselt.html')
await dl2.saveAs(sealed)
const sealedSrc = readFileSync(sealed, 'utf8')
const leak = sealedSrc.includes('Smoke test entry')
console.log('5) Verschlüsselt gespeichert — Klartext im Quelltext auffindbar:', leak)
if (leak) fail('Klartext steht noch in der Datei')

// Öffnen mit falscher und richtiger Passphrase
const page3 = await ctx.newPage()
page3.on('pageerror', (e) => errors.push(String(e)))
await page3.goto('file://' + sealed)
await page3.waitForSelector('#gate-pass')
await page3.locator('#gate-pass').fill('falsch')
await page3.getByRole('button', { name: 'Unlock' }).click()
await page3.waitForSelector('.error')
console.log('6) Falsche Passphrase abgewiesen:', await page3.locator('.error').isVisible())

await page3.screenshot({ path: resolve(tmp, 'sperrbildschirm.png') })
await page3.locator('#gate-pass').fill('korrekt-pferd-batterie')
await page3.getByRole('button', { name: 'Unlock' }).click()
await page3.waitForSelector('table tbody tr', { timeout: 15000 })
const rows4 = await page3.locator('table tbody tr').count()
console.log('7) Richtige Passphrase — Zeilen:', rows4)
if (rows4 !== 12) fail('Entschlüsseln unvollständig')

// CSV-Export
const dl3 = await Promise.all([
  page3.waitForEvent('download'),
  page3.getByText('CSV for Excel').click(),
]).then(([d]) => d)
const csv = resolve(tmp, 'export.csv')
await dl3.saveAs(csv)
console.log('8) CSV-Export:', readFileSync(csv, 'utf8').split('\n').length - 1, 'Zeilen')

// Einstellungen: Dunkelmodus, Titel, Wasserzeichen
await page3.getByLabel('Settings').click()
await page3.waitForSelector('.settings')
await page3.getByRole('button', { name: 'Dark', exact: true }).click()
await page3.waitForFunction(() => document.documentElement.dataset.theme === 'dark', null, { timeout: 5000 })
const themeAttr = await page3.evaluate(() => document.documentElement.dataset.theme)
console.log('9) Dunkelmodus aktiv:', themeAttr)
if (themeAttr !== 'dark') fail('Theme wurde nicht gesetzt')

await page3.locator('.setting__control input[type="text"], .setting__control input:not([type])').first().fill('Audit actions')
await page3.getByRole('button', { name: 'Compact', exact: true }).click()
await page3.waitForTimeout(300)
await page3.screenshot({ path: resolve(tmp, 'einstellungen-dunkel.png'), fullPage: true })

await page3.getByRole('button', { name: 'Back to the list' }).click()
await page3.waitForSelector('table tbody tr')
await page3.waitForTimeout(300)
console.log('10) Wasserzeichen sichtbar:', await page3.locator('.watermark').isVisible())
console.log('    Kopftitel:', await page3.locator('.head h1').innerText())
await page3.screenshot({ path: resolve(tmp, 'liste-dunkel.png') })

// Speichern und erneut oeffnen: reisen Einstellungen mit?
const dl4 = await Promise.all([
  page3.waitForEvent('download', { timeout: 15000 }),
  page3.locator('.filebar__save').click(),
]).then(([d]) => d)
const runde3 = resolve(tmp, 'runde3.html')
await dl4.saveAs(runde3)

const page4 = await ctx.newPage()
page4.on('pageerror', (e) => errors.push(String(e)))
await page4.goto('file://' + runde3)
await page4.waitForSelector('#gate-pass')
const gateTheme = await page4.evaluate(() => document.documentElement.dataset.theme)
const gateTitle = await page4.locator('.gate__box h1').innerText()
console.log('11) Sperrbildschirm — Theme:', gateTheme, '| Titel:', gateTitle)
if (gateTheme !== 'dark') fail('Theme kam nicht aus der Datei zurueck')
await page4.screenshot({ path: resolve(tmp, 'sperrbildschirm-dunkel.png') })

// KI-Integration gegen den nachgebauten Endpunkt
const page5 = await ctx.newPage()
page5.on('pageerror', (e) => errors.push(String(e)))
await page5.goto('file://' + dist)
await page5.waitForSelector('table tbody tr')
await page5.getByLabel('Settings').click()
await page5.waitForSelector('.settings')
await page5.getByText('off', { exact: true }).click()
await page5.waitForSelector('input[placeholder="https://…/openai/v1"]')
await page5.locator('input[placeholder="https://…/openai/v1"]').fill('http://127.0.0.1:8899/v1')
await page5.locator('input[placeholder="gpt-4o-mini"]').fill('mock-model')
await page5.locator('input[type="password"]').fill('test-key')

await page5.getByRole('button', { name: 'Test' }).click()
await page5.waitForSelector('.note--ok', { timeout: 10000 })
console.log('12) Verbindungstest:', (await page5.locator('.note--ok').innerText()).slice(0, 60))
console.log('    Anlaeufe bis zum Erfolg:', seen.length)
const negotiated = seen[seen.length - 1].body
console.log('    Ausgehandelt:', Object.keys(negotiated).join(', '))
if (!('max_completion_tokens' in negotiated)) fail('Token-Parameter nicht umgestellt')
if ('temperature' in negotiated) fail('Temperatur nicht entfernt')
console.log('    Anzeige:', await page5.locator('.dialect').innerText())

await page5.getByRole('button', { name: 'Back to the list' }).click()
await page5.waitForSelector('.chat__bar')
await page5.locator('.chat__bar').click()
await page5.locator('.chat__input textarea').fill('What is overdue?')
await page5.getByRole('button', { name: 'Send' }).click()
await page5.waitForSelector('.chat__msg--assistant .chat__text:not(.chat__text--wait)', { timeout: 10000 })
console.log('13) Antwort im Dialog:', await page5.locator('.chat__msg--assistant .chat__text').last().innerText())

const callsBefore = seen.length
const call = seen[seen.length - 1]
const system = call.body.messages[0].content
console.log('14) Aufruf:', call.url, '| Modell:', call.body.model, '| Auth:', call.headers.authorization)
console.log('    Kontext enthält Datensätze:', system.includes('A-1041'), '| Kennzahlen:', system.includes('überfällig'))
if (!system.includes('A-1041')) fail('Dateidaten fehlen im Kontext')
if (call.headers.authorization !== 'Bearer test-key') fail('Authorization-Header falsch')
console.log('    Aufrufe fuer diese Frage:', callsBefore - 3, '(gelernter Dialekt sitzt beim ersten Versuch)')
await page5.waitForTimeout(300)
await page5.screenshot({ path: resolve(tmp, 'ki-dialog.png') })

// Anhang und Schreibzugriff
const anhang = resolve(tmp, 'vorgaben.md')
writeFileSync(anhang, '# Requirements\nMandatory training counts as completed.\n')
await page5.setInputFiles('.chat__input input[type="file"]', anhang)
await page5.waitForSelector('.chip')
console.log('20) Anhang angenommen:', await page5.locator('.chip').first().innerText())

await page5.locator('.chat__input textarea').fill('Set A-1041 to done according to the attachment.')
await page5.getByRole('button', { name: 'Send' }).click()
await page5.waitForSelector('.proposal', { timeout: 10000 })

const sentSystem = seen[seen.length - 1].body.messages[0].content
console.log('    Anhangstext im Kontext:', sentSystem.includes('Mandatory training counts as completed'))
console.log('    Schreibprotokoll im Kontext:', sentSystem.includes('"op":"update"'))
if (!sentSystem.includes('Mandatory training counts as completed')) fail('Anhang fehlt im Kontext')

await page5.waitForTimeout(300)
await page5.screenshot({ path: resolve(tmp, 'ki-vorschlag.png') })
const vorschlag = await page5.locator('.proposal li').allInnerTexts()
console.log('21) Vorschlag:')
vorschlag.forEach((v) => console.log('      ' + v))

await page5.getByRole('button', { name: 'Apply' }).click()
await page5.waitForSelector('.proposal--done')
const bilanz = await page5.locator('.proposal--done p').allInnerTexts()
console.log('22) Ergebnis der Pruefung:')
bilanz.forEach((v) => console.log('      ' + v))
if (!bilanz.some((t) => t.includes('A-1041'))) fail('Gueltige Aenderung nicht angewandt')
if (!bilanz.some((t) => t.includes('finished'))) fail('Ungueltiger Wert wurde nicht beanstandet')

await page5.locator('.chat__bar').click()
await page5.waitForTimeout(300)
const zeilen = await page5.locator('table tbody tr').count()
const statusM1041 = await page5.locator('tr:has-text("A-1041") .pill').innerText()
console.log('23) Datenstand danach:', zeilen, 'Zeilen | A-1041:', statusM1041)
if (zeilen !== 12) fail('Neuer Datensatz fehlt')
if (statusM1041 !== 'done') fail('Status wurde nicht gesetzt')
await page5.screenshot({ path: resolve(tmp, 'ki-aenderung.png') })
await page5.locator('.chat__bar').click()

// Ohne den Haken darf der Schluessel nicht in die Datei wandern
const dl5 = await Promise.all([
  page5.waitForEvent('download', { timeout: 15000 }),
  page5.locator('.filebar__save').click(),
]).then(([d]) => d)
const klartext = resolve(tmp, 'runde4-ohne-key.html')
await dl5.saveAs(klartext)
const klartextSrc = readFileSync(klartext, 'utf8')
const keyLeak = klartextSrc.includes('test-key')
console.log('15) API-Schlüssel ohne Haken in der Datei auffindbar:', keyLeak)
if (keyLeak) fail('API-Schluessel wurde ungefragt gespeichert')
console.log('16) Dialekt in der Datei hinterlegt:', klartextSrc.includes('max_completion_tokens'))
if (!klartextSrc.includes('max_completion_tokens')) fail('Dialekt wurde nicht mitgespeichert')
const settingsKept =
  klartextSrc.includes('mock-model') && klartextSrc.includes('127.0.0.1:8899')
console.log('    Endpunkt und Modell mitgespeichert:', settingsKept)
if (!settingsKept) fail('Einstellungen wurden nicht mitgespeichert')

// Neu geoeffnet: Nachfrage nach dem Schluessel, Abschalten moeglich
const page6 = await ctx.newPage()
page6.on('pageerror', (e) => errors.push(String(e)))
await page6.goto('file://' + klartext)
await page6.waitForSelector('.modal', { timeout: 5000 })
console.log('17) Nachfrage beim Öffnen:', await page6.locator('.modal h2').innerText())
await page6.screenshot({ path: resolve(tmp, 'ki-nachfrage.png') })
await page6.getByRole('button', { name: 'Switch AI integration off' }).click()
await page6.waitForTimeout(300)
console.log('    Dialogleiste nach dem Ausschalten:', await page6.locator('.chat__bar').count())
if ((await page6.locator('.chat__bar').count()) !== 0) fail('Kill-Switch hat nicht gegriffen')

// Mit Haken landet der Schluessel bewusst in der Datei
await page5.locator('.chat__bar').click() // Dialogleiste einklappen, sonst verdeckt sie den Fuß
await page5.getByLabel('Settings').click()
await page5.waitForSelector('.settings')
const storeToggle = page5.getByText('this session only')
await storeToggle.scrollIntoViewIfNeeded()
await storeToggle.click()
await page5.waitForSelector('.note--warn >> nth=1')
const dl6 = await Promise.all([
  page5.waitForEvent('download', { timeout: 15000 }),
  page5.locator('.filebar__save').click(),
]).then(([d]) => d)
const mitKey = resolve(tmp, 'runde5-mit-key.html')
await dl6.saveAs(mitKey)
console.log('18) API-Schlüssel mit Haken in der Datei:', readFileSync(mitKey, 'utf8').includes('test-key'))
if (!readFileSync(mitKey, 'utf8').includes('test-key')) fail('Haken wurde nicht beachtet')

const page7 = await ctx.newPage()
page7.on('pageerror', (e) => errors.push(String(e)))
await page7.goto('file://' + mitKey)
await page7.waitForSelector('.chat__bar')
await page7.waitForTimeout(400)
console.log('19) Keine Nachfrage, wenn der Schlüssel dabei ist:', (await page7.locator('.modal').count()) === 0)
if ((await page7.locator('.modal').count()) !== 0) fail('Unnoetige Nachfrage')

// Konfiguration sichern und in eine frische Datei laden
if (!(await page5.locator('.settings').isVisible())) {
  await page5.getByLabel('Settings').click()
}
await page5.waitForSelector('.settings')
const dlCfg = await Promise.all([
  page5.waitForEvent('download', { timeout: 15000 }),
  page5.locator('.settings').getByRole('button', { name: 'Save', exact: true }).click(),
]).then(([d]) => d)
const cfgPfad = resolve(tmp, 'konfiguration.json')
await dlCfg.saveAs(cfgPfad)
const cfg = JSON.parse(readFileSync(cfgPfad, 'utf8'))
console.log('24) Konfiguration gesichert:', dlCfg.suggestedFilename())
console.log('    Modell:', cfg.settings.ai.model, '| Endpunkt:', cfg.settings.ai.baseUrl)
console.log('    Enthält Datensätze:', JSON.stringify(cfg).includes('four-eyes principle'))
console.log('    Enthält Schlüssel:', JSON.stringify(cfg).includes('test-key'))
if (JSON.stringify(cfg).includes('test-key')) fail('Schluessel in der Konfiguration')
if (JSON.stringify(cfg).includes('four-eyes principle')) fail('Nutzdaten in der Konfiguration')

// Fremde und unsinnige Felder muessen beim Laden hinausfliegen
cfg.settings.unbekannt = 'weg damit'
cfg.settings.ai.temperature = 'heiss'
writeFileSync(cfgPfad, JSON.stringify(cfg))

const page9 = await ctx.newPage()
page9.on('pageerror', (e) => errors.push(String(e)))
await page9.goto('file://' + dist)
await page9.waitForSelector('table tbody tr')
await page9.getByLabel('Settings').click()
await page9.waitForSelector('.settings')
// Der Dateidialog laeuft ueber ein erzeugtes Element - dessen Klick abfangen
await page9.evaluate(() => {
  const original = HTMLInputElement.prototype.click
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { window.__pickerInput = this; return }
    return original.call(this)
  }
})
await page9.locator('.settings').getByRole('button', { name: 'Load', exact: true }).click()
await page9.waitForFunction(() => window.__pickerInput)
const handle = await page9.evaluateHandle(() => window.__pickerInput)
await handle.asElement().setInputFiles(cfgPfad)
await page9.waitForSelector('.toast', { timeout: 5000 })
console.log('25) Import:', await page9.locator('.toast').innerText())
await page9.waitForTimeout(300)
const uebernommen = await page9.locator('input[placeholder="gpt-4o-mini"]').inputValue()
console.log('    Modell übernommen:', uebernommen)
if (uebernommen !== 'mock-model') fail('Konfiguration wurde nicht angewandt')
const temp = await page9.locator('.setting__control .pair input').first().inputValue()
console.log('    Unsinnige Temperatur zurückgesetzt auf:', temp)
if (temp !== '0.2') fail('Ungueltiger Wert wurde uebernommen')

// Der Import hat die KI eingeschaltet - die Nachfrage steht im Weg
if (await page9.locator('.modal').isVisible()) {
  console.log('    Nachfrage nach Import erschienen:', await page9.locator('.modal h2').innerText())
  await page9.getByRole('button', { name: 'Later' }).click()
  await page9.waitForTimeout(200)
}

// Branding: Farben und hochgeladenes Logo
await page9.locator('#c-accent').evaluate((el) => {
  el.value = '#8a2f5a'
  el.dispatchEvent(new Event('input', { bubbles: true }))
})
await page9.waitForTimeout(300)
const accentVar = await page9.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--tone-accent').trim(),
)
const derived = await page9.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--tone-accent-soft').trim(),
)
console.log('26) Akzentfarbe gesetzt:', accentVar, '| abgeleiteter Hellton:', derived)
if (accentVar !== '#8a2f5a') fail('Farbe wurde nicht angewandt')

await page9.evaluate(() => {
  const original = HTMLInputElement.prototype.click
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { window.__logoInput = this; return }
    return original.call(this)
  }
})
await page9.getByRole('button', { name: 'Replace SVG' }).click()
await page9.waitForFunction(() => window.__logoInput)
const logoHandle = await page9.evaluateHandle(() => window.__logoInput)
await logoHandle.asElement().setInputFiles(logoFixture)
await page9.waitForSelector('.note--ok')
console.log('27) Logo:', await page9.locator('.note--ok').innerText())
const marks = await page9.locator('.wordmark--logo').count()
const hasScript = await page9.evaluate(() => !!document.querySelector('.wordmark--logo script'))
const hasOnclick = await page9.evaluate(() =>
  !!document.querySelector('.wordmark--logo [onclick]'),
)
console.log('    Logo an Stellen gerendert:', marks, '| script:', hasScript, '| onclick:', hasOnclick)
if (hasScript || hasOnclick) fail('SVG wurde nicht bereinigt')
if (marks < 2) fail('Logo ersetzt die Wortmarke nicht')
await page9.waitForTimeout(300)
await page9.screenshot({ path: resolve(tmp, 'branding.png'), fullPage: false })

// CSV-Import: Zuordnungsdialog, tolerante Typpruefung, benannte Beanstandungen.
// Absichtlich gemischt: eine Zeile ohne Titel, ein unbekannter Aufzaehlungswert,
// ein Datum im falschen Format, und eine Spalte, die die Vorbelegung nicht
// erraten kann (deutsche Ueberschrift auf englischem Feld) und die deshalb von
// Hand zugeordnet werden muss.
const csvFixture = resolve(tmp, 'import.csv')
writeFileSync(
  csvFixture,
  'Title;Owner;Area;Status;Aufwand in Tagen;Due date\r\n' +
    'Recertify access rights;M. Voss;IT Operations;open;7;2026-11-30\r\n' +
    'Supplier audit Nordwind;A. Reinke;Procurement;in progress;12;2026-09-15\r\n' +
    ';X. No title;IT Operations;open;2;2026-10-01\r\n' +
    'Wrong status;K. Lorenz;People;erledigt;3;2026-12-01\r\n' +
    'Wrong date;D. Ahrens;Organization;open;5;31.12.2026\r\n',
)

const page10 = await ctx.newPage()
page10.on('pageerror', (e) => errors.push(String(e)))
await page10.goto('file://' + dist)
await page10.waitForSelector('table tbody tr')
const beforeImport = await page10.locator('table tbody tr').count()
await page10.evaluate(() => {
  const original = HTMLInputElement.prototype.click
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { window.__csvPicker = this; return }
    return original.call(this)
  }
})
await page10.getByText('Import CSV', { exact: true }).click()
await page10.waitForFunction(() => window.__csvPicker)
const csvHandle = await page10.evaluateHandle(() => window.__csvPicker)
await csvHandle.asElement().setInputFiles(csvFixture)
await page10.waitForSelector('.import__map', { timeout: 5000 })
console.log('28) CSV-Zuordnungsdialog:', await page10.locator('.modal--wide .note').first().innerText())

const autoMapped = await page10.locator('.import__map select').evaluateAll((els) =>
  els.map((e) => e.value),
)
console.log('    Vorbelegte Zuordnung:', JSON.stringify(autoMapped))
if (autoMapped.filter(Boolean).length !== 5) fail('Automatische Spaltenzuordnung unvollstaendig')
if (autoMapped[4] !== '') fail('Deutsche Spaltenueberschrift haette nicht zugeordnet werden duerfen')

await page10
  .locator('.import__map tbody tr', { hasText: 'Aufwand in Tagen' })
  .locator('select')
  .selectOption('effort')
await page10.screenshot({ path: resolve(tmp, 'csv-zuordnung.png') })
await page10.getByRole('button', { name: 'Import', exact: true }).click()
await page10.waitForSelector('.import__problems', { timeout: 5000 })
console.log('29) Ergebnis:', await page10.locator('.modal--wide .note').first().innerText())
const csvProblems = await page10.locator('.import__problems li').allInnerTexts()
csvProblems.forEach((p) => console.log('      ' + p))
if (csvProblems.length !== 3) fail('Erwartet 3 Beanstandungen aus der Testdatei')
if (!csvProblems.some((p) => p.includes('no title'))) fail('Zeile ohne Titel nicht beanstandet')
if (!csvProblems.some((p) => p.includes('erledigt'))) fail('Unbekannter Statuswert nicht beanstandet')
if (!csvProblems.some((p) => p.includes('31.12.2026'))) fail('Falsches Datumsformat nicht beanstandet')
await page10.screenshot({ path: resolve(tmp, 'csv-ergebnis.png') })
await page10.getByRole('button', { name: 'Close' }).click()
await page10.waitForTimeout(200)

const afterImport = await page10.locator('table tbody tr').count()
console.log('30) Zeilen', beforeImport, '->', afterImport, '(4 von 5 Zeilen gueltig)')
if (afterImport !== beforeImport + 4) fail('Falsche Anzahl importierter Datensaetze')
const importedRow = await page10.locator('tr:has-text("Recertify access rights")').innerText()
console.log('    Importierte Zeile:', importedRow.replace(/\s+/g, ' '))
if (!importedRow.includes('M. Voss')) fail('Zugeordnete Spalte kam nicht an')
if (!/\b7\b/.test(importedRow)) fail('Von Hand zugeordnete Spalte kam nicht an')
if (/A-\s*$/.test(importedRow)) fail('Kein Bezeichner vergeben')

// Aufrufzaehler: zaehlt vorbelegt, laesst sich auf einen eigenen Endpunkt
// umstellen (reist mit der Datei), und schweigt abgeschaltet vollstaendig.
const countSpy = async (page) => {
  const hits = []
  for (const pattern of ['**goatcounter.com/**', '**zaehler.intern/**']) {
    await page.route(pattern, (route) => {
      hits.push(route.request().url())
      route.fulfill({ status: 200, body: '' })
    })
  }
  return hits
}

const page11 = await ctx.newPage()
page11.on('pageerror', (e) => errors.push(String(e)))
const countHits = await countSpy(page11)
await page11.goto('file://' + dist)
await page11.waitForSelector('table tbody tr')
await page11.waitForTimeout(400)
console.log('31) Zaehler vorbelegt:', countHits.length, 'Aufruf |', countHits[0] ?? '-')
if (countHits.length !== 1) fail('Aufrufzaehler hat nicht gezaehlt')
if (!countHits[0]?.includes('p=opentoolbox')) fail('Zaehlpfad fehlt')
if (countHits[0]?.includes('action-items')) fail('Dateiname darf nicht im Zaehlaufruf stehen')

await page11.getByLabel('Settings').click()
await page11.waitForSelector('.settings')
await page11.locator('input[placeholder="empty — count nothing"]').fill('https://zaehler.intern/count')
const dlOwn = await Promise.all([
  page11.waitForEvent('download', { timeout: 15000 }),
  page11.locator('.filebar__save').click(),
]).then(([d]) => d)
const ownCounter = resolve(tmp, 'zaehler-eigen.html')
await dlOwn.saveAs(ownCounter)

const page12 = await ctx.newPage()
page12.on('pageerror', (e) => errors.push(String(e)))
const ownHits = await countSpy(page12)
await page12.goto('file://' + ownCounter)
await page12.waitForSelector('table tbody tr')
await page12.waitForTimeout(400)
console.log('32) Eigener Endpunkt:', ownHits[0] ?? '-')
if (!ownHits[0]?.startsWith('https://zaehler.intern/')) fail('Eigener Zaehl-Endpunkt reist nicht mit')

await page12.getByLabel('Settings').click()
await page12.waitForSelector('.settings')
await page12.getByText('counting', { exact: true }).click()
await page12.waitForTimeout(200)
const dlOff = await Promise.all([
  page12.waitForEvent('download', { timeout: 15000 }),
  page12.locator('.filebar__save').click(),
]).then(([d]) => d)
const offCounter = resolve(tmp, 'zaehler-aus.html')
await dlOff.saveAs(offCounter)

const page13 = await ctx.newPage()
page13.on('pageerror', (e) => errors.push(String(e)))
let foreignRequests = 0
page13.on('request', (r) => {
  if (!r.url().startsWith('file://') && !r.url().startsWith('data:')) foreignRequests++
})
await page13.goto('file://' + offCounter)
await page13.waitForSelector('table tbody tr')
await page13.waitForTimeout(400)
console.log('33) Abgeschaltet — fremde Requests insgesamt:', foreignRequests)
if (foreignRequests !== 0) fail('Abgeschalteter Zaehler oeffnet trotzdem eine Verbindung')

// Dashboard: Kacheln aus dem DASHBOARD-Export, Zahlen muessen zur Seitenleiste
// passen, Ring und Legende muessen dieselbe Summe zeigen wie die Datensaetze.
const page14 = await ctx.newPage()
page14.on('pageerror', (e) => errors.push(String(e)))
page14.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page14.goto('file://' + dist)
await page14.waitForSelector('table tbody tr')
const railOverdue = await page14.locator('.kpi .is-flag dd').innerText()

await page14.getByRole('tab', { name: 'Dashboard' }).click()
await page14.waitForSelector('.dashboard')
const tileCount = await page14.locator('.tile').count()
const statValues = await page14.locator('.tile--stat .tile__value').allInnerTexts()
console.log('34) Dashboard-Kacheln:', tileCount, '| Kennzahlen:', statValues.join(' '))
if (tileCount !== 6) fail('Erwartet 6 Kacheln aus dem DASHBOARD-Export')
if (statValues[0] !== '11') fail('Anzahl-Kachel stimmt nicht mit dem Bestand ueberein')
if (statValues[1] !== railOverdue) fail('Ueberfaellig-Kachel weicht von der Seitenleiste ab')

const donutTotal = await page14.locator('.donut__total').textContent()
const legendSum = (await page14.locator('.legend__value').allInnerTexts()).reduce(
  (n, t) => n + Number(t),
  0,
)
console.log('    Ring-Summe:', donutTotal, '| Legendensumme:', legendSum)
if (Number(donutTotal) !== legendSum) fail('Ring und Legende widersprechen sich')
if (Number(donutTotal) !== 11) fail('Ring zaehlt nicht alle Datensaetze')
await page14.screenshot({ path: resolve(tmp, 'dashboard-hell.png') })

// Kategoriefarben muessen im Dunkelmodus die Richtung drehen, sonst verschwindet
// ein Ende der Reihe im Hintergrund.
const lightFirstBar = await page14.locator('.bars__fill').first().evaluate((el) => el.style.background)
await page14.getByLabel('Settings').click()
await page14.waitForSelector('.settings')
await page14.getByRole('button', { name: 'Dark', exact: true }).click()
await page14.getByRole('button', { name: 'Back to the list' }).click()
await page14.getByRole('tab', { name: 'Dashboard' }).click()
await page14.waitForSelector('.dashboard')
const darkFirstBar = await page14.locator('.bars__fill').first().evaluate((el) => el.style.background)
console.log('35) Erste Kategoriefarbe hell:', lightFirstBar, '| dunkel:', darkFirstBar)
if (lightFirstBar === darkFirstBar) fail('Kategoriefarben drehen im Dunkelmodus nicht')
await page14.screenshot({ path: resolve(tmp, 'dashboard-dunkel.png') })

// Druckansicht: alles Bedienbare faellt weg, der Inhalt bleibt.
await page14.getByLabel('Settings').click()
await page14.getByRole('button', { name: 'Light', exact: true }).click()
await page14.getByRole('button', { name: 'Back to the list' }).click()
await page14.waitForSelector('table tbody tr')
await page14.emulateMedia({ media: 'print' })
const printed = await page14.evaluate(() => {
  const display = (sel) => {
    const el = document.querySelector(sel)
    return el ? getComputedStyle(el).display : 'absent'
  }
  return {
    filebar: display('.filebar'),
    rail: display('.rail'),
    toolbar: display('.toolbar'),
    watermark: display('.watermark'),
    actions: display('.head__actions'),
    table: display('table'),
  }
})
console.log('36) Im Druck ausgeblendet:', JSON.stringify(printed))
for (const part of ['filebar', 'rail', 'toolbar', 'watermark', 'actions']) {
  if (printed[part] !== 'none') fail(`${part} wird mitgedruckt`)
}
if (printed.table === 'none') fail('Tabelle fehlt im Druck')
await page14.screenshot({ path: resolve(tmp, 'druck-liste.png'), fullPage: true })
await page14.emulateMedia({ media: 'screen' })

// Vorschau im hellen Modus
await page3.getByLabel('Settings').click()
await page3.waitForSelector('.settings')
await page3.getByRole('button', { name: 'Light', exact: true }).click()
await page3.getByRole('button', { name: 'Normal', exact: true }).click()
await page3.waitForTimeout(300)
await page3.screenshot({ path: resolve(tmp, 'einstellungen-hell.png'), fullPage: true })
await page3.getByRole('button', { name: 'Back to the list' }).click()
await page3.waitForSelector('table tbody tr')
await page3.waitForTimeout(500)
await page3.screenshot({ path: resolve(tmp, 'desktop.png'), fullPage: false })
await page3.locator('table tbody tr').first().click()
await page3.waitForSelector('.drawer')
await page3.waitForTimeout(500)
await page3.screenshot({ path: resolve(tmp, 'drawer.png') })
await page3.setViewportSize({ width: 390, height: 780 })
await page3.keyboard.press('Escape')
await page3.waitForTimeout(400)
await page3.screenshot({ path: resolve(tmp, 'mobil.png') })

console.log(errors.length ? '\nKonsolenfehler:\n' + errors.join('\n') : '\nKeine Konsolenfehler.')
await browser.close()
mock.close()
