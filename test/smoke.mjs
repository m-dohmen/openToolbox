// SPDX-License-Identifier: Apache-2.0
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { buildUrl, parseHeaders } from '../src/lib/ai.js'
import { safeUrl } from '../src/lib/links.js'
import { applyActions } from '../src/lib/actions.js'
import { parse } from '../src/lib/markdown.js'
import { translator } from '../src/i18n.js'
import { relativeAge } from '../src/lib/time.js'
import { groupByDueDate, hasDueDates } from '../src/lib/dueDate.js'
import { HISTORY_LIMIT, pushHistory } from '../src/lib/history.js'
import { normalizeEntities, screenImportRows, fieldValue, materialize } from '../src/lib/entities.js'
import { validateMetrics, metricValue } from '../src/lib/metrics.js'
import * as twoEntityDomain from '../examples/suppliers-certificates.domain.js'
import {
  matchesSearch,
  matchesFilters,
  filterableFields,
  filterChipLabel,
  highlightParts,
} from '../src/lib/search.js'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildWithDomain, pidSuffix } from './domain-swap.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist/index.html')
const tmp = resolve(root, 'test/.out')
mkdirSync(tmp, { recursive: true })


/**
 * Speichern und die Datei einsammeln. Mit eingeschaltetem Aenderungsprotokoll
 * (Voreinstellung) fragt das Speichern erst nach Notiz und Version - der
 * Helfer beantwortet das, damit die uebrigen Pruefungen sich nicht darum
 * kuemmern muessen.
 */
async function saveTo(page, target, note) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    (async () => {
      await page.locator('.filebar__save').click()
      const dialog = page.locator('#log-note')
      if (await dialog.count()) {
        if (note) await dialog.fill(note)
        await page.locator('.modal__foot .btn--primary').click()
      }
    })(),
  ])
  await download.saveAs(target)
  return download
}

/**
 * Datei oeffnen und in der Liste landen. Seit der Startseite ist die Liste
 * nicht mehr der Einstieg - die Pruefungen unten interessiert aber fast immer
 * die Tabelle, nicht der Begruessungstext.
 */
async function openList(page, file) {
  await page.goto('file://' + file)
  await page.waitForSelector('.home, table tbody tr', { timeout: 5000 })
  if (await page.locator('.home').count()) {
    await page.locator('.home__foot .btn--primary').click()
  }
  await page.waitForSelector('table tbody tr', { timeout: 5000 })
}

/**
 * Wartet, bis der Startfokus des Formulars gezogen hat. Er wird beim Montieren
 * gesetzt; greift er erst NACH dem element.focus() der Pruefkette, steht der
 * Caret im Titelfeld am Ende und die naechste Eingabe haengt sich an den
 * vorhandenen Titel an - genau das war die Ursache des CI-Flakys um Schritt
 * 2m (OPEN-43). Jedes Ausfuellen nach dieser Wartezeit ist davon getrennt.
 */
async function formFocused(page) {
  await page.waitForFunction(() => !!document.querySelector('.drawer')?.contains(document.activeElement), undefined, { timeout: 5000 })
}

const fail = (m) => {
  console.error('FEHLER: ' + m)
  process.exitCode = 1
}

// Test-Logo mit absichtlich unsauberem Markup, um den SVG-Sanitiser zu pruefen.
// Neben Skript und Event-Handlern tragen beide CSS-Vektoren externe Verweise
// (OPEN-71): ein <style>-Element mit @import und ein style-Attribut mit url().
const EXTERNAL = 'attacker.example'
const logoFixture = resolve(tmp, 'logo.svg')
writeFileSync(
  logoFixture,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" onload="evil()" style="fill:url(https://attacker.example/root)">' +
    '<script>alert(1)</script>' +
    '<style>@import url("https://attacker.example/track.css"); rect { fill: #f00 }</style>' +
    '<rect width="100" height="40" fill="#0e7c86" onclick="evil()" />' +
    '<rect y="20" width="100" height="20" style="fill:url(\'https://attacker.example/pixel\')" />' +
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
// Port 0 statt 8899: der Kernel vergibt einen freien Port, damit zwei
// gleichzeitige Laeufe derselben Suite nicht mit EADDRINUSE kollidieren
// (OPEN-75). Der tatsaechliche Port steht nach dem Listen fest und wird
// ueber mockBase an alle Stellen verteilt, die den Endpunkt brauchen.
await new Promise((r) => mock.listen(0, '127.0.0.1', r))
const mockBase = `http://127.0.0.1:${mock.address().port}`

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

/* Adressen der Kopfzeilen-Verweise landen in einem href. Alles, was dort einen
   Klick von einem Skriptaufruf entfernt waere, muss vorher rausfallen. */
const urlGuard = [
  ['https://example.com/x', 'https://example.com/x'],
  ['intranet.firma.de/qm', 'https://intranet.firma.de/qm'],
  ['mailto:qs@firma.de', 'mailto:qs@firma.de'],
  ['javascript:alert(1)', ''],
  ['  JavaScript:alert(1)  ', ''],
  ['data:text/html,<script>alert(1)</script>', ''],
  ['vbscript:msgbox(1)', ''],
  ['file:///etc/passwd', ''],
  ['', ''],
  ['   ', ''],
]
let guardOk = 0
for (const [input, expected] of urlGuard) {
  const got = safeUrl(input)
  if (got === expected) guardOk++
  else fail(`safeUrl: ${JSON.stringify(input)} -> ${JSON.stringify(got)}, erwartet ${JSON.stringify(expected)}`)
}
console.log(`0a) Adresspruefung der Verweise: ${guardOk}/${urlGuard.length} Faelle korrekt`)

/* Der dritte Weg durch die Regeln: ein Vorschlag des Modells. Direkt gegen
   applyActions geprueft, weil der nachgebaute Endpunkt weiter oben absichtlich
   regelkonforme Aenderungen liefert. */
const ruleSchema = {
  idField: 'id',
  singular: 'item',
  plural: 'items',
  titleField: 'title',
  list: ['title'],
  facets: [],
  search: ['title'],
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'owner', label: 'Owner', type: 'text' },
    { key: 'status', label: 'Status', type: 'enum', values: ['open', 'done'] },
  ],
  rules: [{ when: (r) => r.status === 'done', require: ['owner'], message: 'Closed needs an owner.' }],
}
const ruleEntities = {
  records: {
    schema: ruleSchema,
    uid: () => 'X-1',
    emptyRecord: () => ({ id: '', title: '', owner: '', status: 'open' }),
    seed: () => [],
    isDone: () => false,
    isOverdue: () => false,
  },
}
const ruleTr = translator('en')
const start = { records: [{ id: 'X-9', title: 'Existing', owner: '', status: 'open' }] }
const bad = applyActions(start, [{ op: 'update', id: 'X-9', changes: { status: 'done' } }], ruleEntities, ruleTr, 'records')
console.log('0b) Regelverstoss im KI-Vorschlag:', JSON.stringify(bad.problems))
if (!bad.problems.some((p) => p.includes('Closed needs an owner'))) fail('Regel greift nicht bei KI-Vorschlaegen')
if (bad.next.records[0].status !== 'open') fail('Abgelehnter Vorschlag wurde trotzdem angewandt')

// Derselbe Vorschlag mit Verantwortlichem geht durch - und zwar vollstaendig.
const good = applyActions(
  start,
  [{ op: 'update', id: 'X-9', changes: { status: 'done', owner: 'M. Voss' } }],
  ruleEntities,
  ruleTr,
  'records',
)
console.log('    Mit Verantwortlichem:', JSON.stringify(good.done))
if (good.problems.length || good.next.records[0].status !== 'done') fail('Zulaessiger Vorschlag wurde abgelehnt')

/* Der Startseitentext wird nicht als HTML abgelegt, sondern als kleiner
   Markdown-Teilsatz geparst und aus einer Baumstruktur gerendert. Alles, was
   nicht in der Liste steht, muss Text bleiben. */
const md = parse('# H\n\nText with <b>markup</b> and <script>alert(1)</script>\n\n- a\n- b\n\n[x](javascript:alert(1))')
const mdJson = JSON.stringify(md)
console.log('0c) Startseiten-Renderer:', md.map((b) => b.type).join(' '))
if (!mdJson.includes('<script>alert(1)<\\/script>') && !mdJson.includes('<script>alert(1)</script>')) {
  fail('Markup haette als Text erhalten bleiben muessen')
}
if (mdJson.includes('"url":"javascript')) fail('javascript:-Adresse landete in einem Verweis')
if (md.filter((b) => b.type === 'list')[0]?.items.length !== 2) fail('Aufzaehlung falsch geparst')

/* Weich umbrochene Listenpunkte: handgeschriebenes Markdown ist fast immer so,
   und der Bruch faellt erst im Layout auf - der Fortsetzungstext stand links
   neben dem Aufzaehlungszeichen statt darunter. */
const wrapped = parse('- Erster Punkt, der ueber die Zeile\n  hinausgeht und weitergeht.\n- Zweiter Punkt\n\nAbsatz danach,\nauch umbrochen.')
console.log('0d) Umbrochene Liste:', wrapped.map((b) => b.type).join(' '))
const list0 = wrapped.find((b) => b.type === 'list')
if (wrapped.filter((b) => b.type === 'list').length !== 1) fail('Umbrochener Punkt hat die Liste zerrissen')
if (list0.items.length !== 2) fail('Umbrochener Punkt wurde zu einem eigenen Eintrag')
if (!String(list0.items[0].join('')).includes('hinausgeht und weitergeht')) {
  fail('Fortsetzungszeile fehlt im Listeneintrag')
}
if (!wrapped.some((b) => b.type === 'paragraph')) fail('Absatz nach der Liste ging verloren')

/* Relative Alters-Angabe der FileBar: reine Berechnung aus Zeitstempel und
   "jetzt", ohne Datum-Zufall - beide Enden getestet, Minuten und Tage. */
const ageNow = Date.parse('2026-08-16T12:00:00Z')
const ageCases = [
  ['2026-08-16T11:59:50Z', 'now', 0],
  ['2026-08-16T11:45:00Z', 'minutes', 15],
  ['2026-08-16T10:00:00Z', 'hours', 2],
  ['2026-08-13T12:00:00Z', 'days', 3],
  ['2026-06-16T12:00:00Z', 'months', 2],
  ['2024-08-16T12:00:00Z', 'years', 2],
  // 360-364-Tage-Grenzfall: floor(days/365) waere hier 0 ("0 years ago"),
  // wenn der Wechsel auf den gerundeten Monats-Bucket statt auf days haengt.
  ['2025-08-21T12:00:00Z', 'months', 12],
  ['2025-08-17T12:00:00Z', 'months', 12],
  ['2025-08-16T12:00:00Z', 'years', 1],
  // Ungueltiger Zeitstempel darf nicht bis zur i18n-Ausgabe als NaN durchlaufen.
  ['not-a-date', 'unknown', 0],
]
const trEn = translator('en')
const trDe = translator('de')
const ageKeys = {
  now: 'filebar.ageJustNow',
  minutes: 'filebar.ageMinutes',
  hours: 'filebar.ageHours',
  days: 'filebar.ageDays',
  months: 'filebar.ageMonths',
  years: 'filebar.ageYears',
}
let ageOk = 0
for (const [iso, unit, n] of ageCases) {
  const got = relativeAge(iso, ageNow)
  if (got.unit === unit && got.n === n) ageOk++
  else fail(`relativeAge: ${iso} -> ${JSON.stringify(got)}, erwartet {unit: ${unit}, n: ${n}}`)
}
console.log(`0e) Relative Alters-Angabe: ${ageOk}/${ageCases.length} Faelle korrekt`)
console.log('    en/15min:', trEn(ageKeys.minutes, 15), '| de/3d:', trDe(ageKeys.days, 3))
if (trEn(ageKeys.minutes, 15) !== '15 minutes ago') fail('Englischer Minutentext falsch')
if (trDe(ageKeys.days, 3) !== 'vor 3 Tagen') fail('Deutscher Tagestext falsch')
if (trEn(ageKeys.minutes, 1) !== '1 minute ago') fail('Einzahl in Minutentext fehlt')
if (trDe(ageKeys.days, 1) !== 'vor 1 Tag') fail('Einzahl in Tagestext fehlt')

/*
 * Fälligkeiten-Gruppierung (Dashboard-Widget): reine Funktion, "heute" wird
 * hereingereicht statt aus new Date() gelesen - genau die injizierbare Uhr,
 * die die Aufgabe verlangt. "today" ist ein Montag (2026-08-17), die Woche
 * läuft also bis Sonntag 2026-08-23 und "nächste 30 Tage" bis 2026-09-22.
 * Jede Grenze wird an beiden Enden geprüft, dazu: erledigt raus, leerer Wert
 * raus, eine Entität ohne dueDate-Deklaration bleibt komplett außen vor.
 */
const dueDateSchema = (dueDate) => ({
  idField: 'id', singular: 'item', plural: 'items', titleField: 'title',
  list: ['title', 'due'], facets: [], search: ['title'],
  ...(dueDate ? { dueDate } : {}),
  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'due', label: 'Due', type: 'date' },
    { key: 'status', label: 'Status', type: 'enum', values: ['open', 'done'] },
  ],
})
const dueDateEntities = {
  items: { schema: dueDateSchema('due'), isDone: (r) => r.status === 'done' },
  others: { schema: dueDateSchema(null), isDone: () => false },
}
const dueDateRecords = {
  items: [
    { id: 'B1', title: 'Yesterday', due: '2026-08-16', status: 'open' },   // overdue (day before today)
    { id: 'B2', title: 'Today', due: '2026-08-17', status: 'open' },       // this week (lower boundary)
    { id: 'B3', title: 'End of week', due: '2026-08-23', status: 'open' }, // this week (upper boundary, Sunday)
    { id: 'B4', title: 'Next Monday', due: '2026-08-24', status: 'open' }, // upcoming (lower boundary)
    { id: 'B5', title: 'Window end', due: '2026-09-22', status: 'open' },  // upcoming (upper boundary)
    { id: 'B6', title: 'Just too far', due: '2026-09-23', status: 'open' }, // one day past the window - excluded
    { id: 'B7', title: 'No due date', due: '', status: 'open' },           // no value - excluded
    { id: 'B8', title: 'Finished overdue', due: '2026-08-01', status: 'done' }, // done - excluded
  ],
  // Not declared as dueDate on `others` - must not surface even though the
  // date would be overdue if the widget read any date field it could find.
  others: [{ id: 'O1', title: 'Unrelated date', due: '2026-08-01', status: 'open' }],
}
const dueGroups = groupByDueDate(dueDateEntities, dueDateRecords, { today: new Date(2026, 7, 17) })
const ids = (list) => list.map((i) => i.record.id)
console.log('0f) Fälligkeiten — überfällig:', ids(dueGroups.overdue), '| diese Woche:', ids(dueGroups.thisWeek), '| kommend:', ids(dueGroups.upcoming))
if (ids(dueGroups.overdue).join() !== 'B1') fail('Überfällig-Gruppe falsch abgegrenzt')
if (ids(dueGroups.thisWeek).join() !== 'B2,B3') fail('Diese-Woche-Gruppe falsch abgegrenzt (Montag/Sonntag-Grenze)')
if (ids(dueGroups.upcoming).join() !== 'B4,B5') fail('Kommend-Gruppe falsch abgegrenzt (30-Tage-Grenze)')
const allGrouped = [...ids(dueGroups.overdue), ...ids(dueGroups.thisWeek), ...ids(dueGroups.upcoming)]
if (allGrouped.includes('B6')) fail('Datum jenseits der 30-Tage-Grenze haette nicht erscheinen duerfen')
if (allGrouped.includes('B7')) fail('Datensatz ohne Datum haette nicht erscheinen duerfen')
if (allGrouped.includes('B8')) fail('Erledigter Datensatz haette nicht als faellig gelten duerfen')
if (allGrouped.includes('O1')) fail('Entitaet ohne dueDate-Deklaration wurde trotzdem einbezogen')
if (!hasDueDates(dueDateEntities)) fail('hasDueDates erkennt eine deklarierte Entitaet nicht')
if (hasDueDates({ others: dueDateEntities.others })) fail('hasDueDates meldet faelschlich eine Deklaration')

/*
 * Undo/Redo-Verlauf (reine Funktion): der Stack waechst bis zur Grenze und
 * verwirft danach das AELTESTE Element, nicht das juengste - wer 50 Schritte
 * zurueckliegt, hat den ersten davon ohnehin nicht mehr im Kopf, den
 * letzten Schritt zu verlieren waere dagegen genau der, den man gerade
 * rueckgaengig machen wollte.
 */
let historyStack = []
for (let i = 0; i < HISTORY_LIMIT + 5; i++) historyStack = pushHistory(historyStack, `state-${i}`)
console.log(`0g) Verlauf gedeckelt: ${historyStack.length}/${HISTORY_LIMIT}, aeltester Eintrag: ${historyStack[0]}`)
if (historyStack.length !== HISTORY_LIMIT) fail('Verlauf ueberschreitet die Grenze')
if (historyStack[0] !== 'state-5') fail('Verlauf hat nicht die aeltesten Eintraege verworfen')
if (historyStack[historyStack.length - 1] !== `state-${HISTORY_LIMIT + 4}`) fail('Juengster Eintrag fehlt nach dem Deckeln')

/*
 * Globale Suche und Feldfilter (lib/search.js), reine Funktionen: Treffer
 * über mehrere Felder hinweg (auch Id, Anhangsname, Reference-Titel,
 * berechnete Felder - nie der base64-Inhalt), Filter je Typ mit Grenzfällen,
 * die Kombination beider, und die Zerlegung für die Hervorhebung.
 */
const sfSchema = {
  idField: 'id', singular: 'item', plural: 'items', titleField: 'title',
  list: ['title', 'owner', 'due', 'size', 'status'], facets: ['status'],
  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'owner', label: 'Owner', type: 'text' },
    { key: 'due', label: 'Due', type: 'date' },
    { key: 'size', label: 'Size', type: 'number' },
    { key: 'status', label: 'Status', type: 'enum', values: ['open', 'done'] },
    { key: 'ref', label: 'Ref', type: 'reference', entity: 'others' },
    { key: 'file', label: 'File', type: 'attachment' },
    { key: 'score', label: 'Score', type: 'computed', compute: (r) => Number(r.size) * 2 },
  ],
}
const sfEntity = { schema: sfSchema, isDone: () => false, isOverdue: () => false }
const sfCtx = {
  entities: {
    items: sfEntity,
    others: {
      schema: { idField: 'id', titleField: 'name', fields: [{ key: 'name', label: 'Name', type: 'text' }] },
    },
  },
  recordsByEntity: { others: [{ id: 'O-1', name: 'Nordwind IT GmbH' }] },
}
const sfRecords = [
  { id: 'X-1', title: 'Alpha report', owner: 'T. Krueger', due: '2026-03-01', size: 5, status: 'open', ref: 'O-1', file: null },
  { id: 'X-2', title: 'Beta audit', owner: 'A. Behrens', due: '2026-04-11', size: 15, status: 'done', ref: '', file: { name: 'proof.pdf', data: 'QUFB' } },
]
console.log('0h) Globale Suche über mehrere Felder:',
  ['KRUEGER', 'beta audit', 'nordwind it', '2026-04-11', '30'].filter((q) =>
    sfRecords.some((r) => matchesSearch(sfEntity, r, q, sfCtx))).length, '/ 5',
  '| base64 als Treffer:', sfRecords.some((r) => matchesSearch(sfEntity, r, 'QUFB', sfCtx)))
// Eigentümer (X-1), Titel (X-2), Reference-Titel (X-1), Datum (X-2), berechnetes Feld 15*2 (X-2)
for (const q of ['KRUEGER', 'beta audit', 'nordwind it', '2026-04-11', '30']) {
  if (!sfRecords.some((r) => matchesSearch(sfEntity, r, q, sfCtx))) fail(`Suche findet "${q}" nicht über die Felder hinweg`)
}
if (sfRecords.some((r) => matchesSearch(sfEntity, r, 'QUFB', sfCtx))) fail('Der base64-Inhalt eines Anhangs wurde durchsucht')
if (!matchesSearch(sfEntity, sfRecords[0], 'x-1', sfCtx)) fail('Die Id wurde nicht durchsucht')

const sfFilterable = filterableFields(sfSchema).map((f) => f.key)
console.log('0i) Filterbare Felder:', sfFilterable.join(', '))
if (sfFilterable.join(',') !== 'title,owner,due,size') {
  fail('Facetten-, Anhangs- und berechnete Felder gehören nicht in den Filterbereich')
}
// Entität ohne einen einzigen filterbaren Typ - der Negativeingangsfall.
const bareSchema = {
  idField: 'id', singular: 'log', plural: 'logs', titleField: 'stamp', facets: [],
  fields: [
    { key: 'stamp', label: 'Stamp', type: 'computed', compute: (r) => r.at },
    { key: 'file', label: 'File', type: 'attachment' },
  ],
}
if (filterableFields(bareSchema).length !== 0) fail('Eine Entität ohne passende Feldtypen bekam doch Filter')

// Datensatz für die Filterfälle: X-2 - done, size 15, due 2026-04-11, Behrens.
const sfFilters = (f) => matchesFilters(sfEntity, sfRecords[1], f)
const sfBlank = { id: 'X-3', title: 'Empty', owner: '', due: '', size: '', status: 'open', ref: '', file: null }
console.log('0j) Feldfilter an einem Datensatz:',
  'enum-mehrfach:', sfFilters({ status: { v: '', values: ['open', 'done'], from: '', to: '' } }),
  '| zahl-von-bis:', sfFilters({ size: { v: '', values: [], from: '10', to: '15' } }),
  '| text-enthält:', sfFilters({ owner: { v: 'BEHRENS', values: [], from: '', to: '' } }))
if (!sfFilters({ status: { v: '', values: ['open', 'done'], from: '', to: '' } })) fail('Mehrfachauswahl schneidet erlaubte Werte ab')
if (sfFilters({ status: { v: '', values: ['open'], from: '', to: '' } })) fail('Mehrfachauswahl ließ einen fremden Wert durch')
if (!sfFilters({ size: { v: '', values: [], from: '10', to: '15' } })) fail('Zahlbereich verliert den eingeschlossenen Wert')
if (sfFilters({ size: { v: '', values: [], from: '16', to: '' } })) fail('Zahlbereich von: Grenze nicht eingehalten')
if (!sfFilters({ size: { v: '', values: [], from: '15', to: '' } })) fail('von-Grenze soll einschließend sein')
if (sfFilters({ size: { v: '', values: [], from: '', to: '14' } })) fail('Zahlbereich bis: Grenze nicht eingehalten')
if (!sfFilters({ due: { v: '', values: [], from: '2026-04-11', to: '' } })) fail('Datum von-Grenze soll einschließend sein')
if (sfFilters({ due: { v: '', values: [], from: '2026-04-12', to: '' } })) fail('Datumsbereich von: Grenze nicht eingehalten')
if (!sfFilters({ due: { v: '', values: [], from: '', to: '2026-04-11' } })) fail('Datum bis-Grenze soll einschließend sein')
if (sfFilters({ due: { v: '', values: [], from: '', to: '2026-04-10' } })) fail('Datumsbereich bis: Grenze nicht eingehalten')
if (!sfFilters({ owner: { v: 'BEHRENS', values: [], from: '', to: '' } })) fail('enthält-Filter ignoriert Groß-/kleinschreibung')
if (matchesFilters(sfEntity, sfBlank, { owner: { v: '', values: [], from: '', to: '' }, due: { v: '', values: [], from: '2020-01-01', to: '' } })) {
  fail('Ein Datensatz ohne Datum ist durch jeden Datumsbereich gerutscht')
}
if (matchesFilters(sfEntity, sfBlank, { size: { v: '', values: [], from: '0', to: '' } })) {
  fail('Ein Datensatz ohne Zahl ist durch jeden Bereich gerutscht (Number("") === 0)')
}
// Kombination: Suche schneidet zuerst, der Filter entscheidet im Rest.
if (!(matchesSearch(sfEntity, sfRecords[1], 'audit', sfCtx) && sfFilters({ size: { v: '', values: [], from: '10', to: '' } }))) {
  fail('Kombination aus Suche und Filter trifft den passenden Datensatz nicht')
}
if (matchesSearch(sfEntity, sfRecords[0], 'audit', sfCtx)) fail('Suchbegriff traf den falschen Datensatz')

const hiParts = highlightParts('Consultant T. Krueger', 'KRUEGER')
console.log('0k) Hervorhebung:', JSON.stringify(hiParts))
if (JSON.stringify(hiParts) !== JSON.stringify([{ text: 'Consultant T. ', hit: false }, { text: 'Krueger', hit: true }])) {
  fail('Der Suchbegriff wurde nicht korrekt zur Hervorhebung zerlegt')
}
if (JSON.stringify(highlightParts('a-b', 'a-b')) !== JSON.stringify([{ text: 'a-b', hit: true }])) {
  fail('Sonderzeichen im Suchbegriff wurden als Muster gelesen')
}
if (highlightParts('Unverändert', '').length !== 1) fail('Ohne Suchbegriff sollte nichts zerlegt werden')
if (filterChipLabel(sfSchema, 'size', { v: '', values: [], from: '10', to: '15' }) !== 'Size: 10 – 15') fail('Chiptext Zahlbereich falsch')
if (filterChipLabel(sfSchema, 'size', { v: '', values: [], from: '10', to: '' }) !== 'Size: 10 – …') fail('Chiptext offene Obergrenze falsch')
if (filterChipLabel(sfSchema, 'status', { v: '', values: ['open', 'done'], from: '', to: '' }) !== 'Status: open, done') fail('Chiptext Mehrfachauswahl falsch')

// 0l) JSON-Import-Siebung: dieselbe Pruefung wie beim CSV-Import, bevor ein
// Datensatz den Bestand erreicht - Typ, Pflichtfelder, Regeln, doppelte Ids.
const impTr = translator('en')
{
  const twoEntities = normalizeEntities(twoEntityDomain)
  const stock = { suppliers: [{ id: 'S-1', name: 'Nordwind IT GmbH' }], certificates: [] }
  const good = {
    id: 'C-1',
    title: 'ISO 27001',
    supplierId: 'Nordwind IT GmbH', // Referenz per Titel, nicht per Id
    type: 'iso 27001', // bewusst abweichende Schreibweise - wird kanonisiert
    expiry: '2027-01-31',
    daysLeft: 999, // berechnetes Feld: darf hereinkommen, bleibt aber draußen
  }
  const { built, problems } = screenImportRows(
    twoEntities.certificates,
    [
      good,
      { id: 'C-2', title: 'Bad enum', supplierId: 'S-1', type: 'Kosmos-Zertifikat' },
      { title: 'No identifier', supplierId: 'S-1' },
      { id: 'C-1', title: 'Duplicate id', supplierId: 'S-1' },
      'no record at all',
    ],
    { entities: twoEntities, recordsByEntity: stock },
    impTr,
  )
  console.log('0l) JSON-Siebung:', built.length, 'durchgelassen,', problems.length, 'Beanstandungen')
  if (built.length !== 1) fail('Genau der gueltige Datensatz sollte durch die Siebung kommen')
  if (built[0].supplierId !== 'S-1') fail('Die Referenz wurde nicht per Titel aufgeloest')
  if (built[0].type !== 'ISO 27001') fail('Der Aufzaehlungswert wurde nicht kanonisiert')
  if ('daysLeft' in built[0]) fail('Ein berechnetes Feld gehoert nicht in den gespeicherten Datensatz')
  const codes = problems.map((p) => p.code)
  if (!codes.includes('notEnum')) fail('Falscher Aufzählungswert wurde nicht beanstandet')
  if (!codes.includes('noId')) fail('Fehlender Bezeichner wurde nicht beanstandet')
  if (!codes.includes('duplicateId')) fail('Doppelter Bezeichner wurde nicht beanstandet')
  if (!codes.includes('notRecord')) fail('Kein Datensatz-Objekt wurde nicht beanstandet')
}
{
  // Regel- und Pflichtfeldpruefung an einem minimalen Schema mit denselben
  // Regeln wie der shipped-Domain.
  const entity = {
    schema: {
      idField: 'id',
      titleField: 'title',
      fields: [
        { key: 'id', label: 'Id', type: 'text' },
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'status', label: 'Status', type: 'enum', values: ['open', 'in progress'] },
        { key: 'owner', label: 'Owner', type: 'text' },
      ],
      rules: [
        {
          when: (r) => r.status === 'in progress',
          require: ['owner'],
          message: 'An item that is under way needs an owner.',
        },
      ],
    },
    emptyRecord: () => ({ id: '', title: '', status: 'open', owner: '' }),
  }
  const { built, problems } = screenImportRows(
    entity,
    [
      { id: 'X-1', status: 'in progress' }, // Pflichtfeld fehlt UND Regel verletzt
      { id: 'X-2', title: 'Fine', status: 'open' },
    ],
    {},
    impTr,
  )
  const texts = problems.map((p) => p.message ?? '')
  console.log('0m) JSON-Siebung Regeln:', built.length, 'durchgelassen |', texts.join(' / '))
  if (built.length !== 1 || built[0].id !== 'X-2') fail('Nur der regelkonforme Datensatz sollte durchkommen')
  if (!texts.some((t) => t.includes('Title is required'))) fail('Pflichtfeldprüfung griff beim JSON-Import nicht')
  if (!texts.some((t) => t.includes('needs an owner'))) fail('Schema-Regel griff beim JSON-Import nicht')
}

/*
 * Berechnete Felder — Memo, Fehlerverhalten, Metric-Anbindung. Reine
 * Funktionen ohne Browser, deshalb vor dem Playwright-Block. Drei Faelle,
 * die zusammen die OPEN-104-Zusicherung traegen: ein gutes Feld,
 * ein werfendes Feld (mit eingefangener Konsole), und der Katalog
 * sum/avg ueber ein berechnetes Feld.
 */

/* Berechnetes Feld mit Zahl-Ergebnis */
const memoEntity = {
  schema: {
    idField: 'id', singular: 'item', plural: 'items', titleField: 'title',
    list: ['title', 'score'], facets: [],
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'base', label: 'Base', type: 'number' },
      { key: 'score', label: 'Score', type: 'computed', compute: (r) => Number(r.base) * 3 },
    ],
  },
  isDone: () => false,
  isOverdue: () => false,
}
const memoRecords = [
  { id: 'M-1', title: 'Alpha', base: 5 },
  { id: 'M-2', title: 'Beta', base: 7 },
  { id: 'M-3', title: 'Gamma', base: 0 },
]
if (fieldValue(memoEntity, memoRecords[0], 'score') !== 15) fail('Berechnetes Feld lieferte nicht den erwarteten Wert')
if (fieldValue(memoEntity, memoRecords[2], 'score') !== 0) fail('0 ist eine echte Antwort, nicht der Strichplatzhalter')

/* Memo: derselbe Aufruf zweimal schaltet compute() still ab. */
let memoCalls = 0
const memoEntity2 = {
  schema: {
    idField: 'id', singular: 'item', plural: 'items', titleField: 'title',
    fields: [
      { key: 'base', label: 'Base', type: 'number' },
      { key: 'doubled', label: 'Doubled', type: 'computed', compute: (r) => { memoCalls++; return Number(r.base) * 2 } },
    ],
  },
  isDone: () => false,
  isOverdue: () => false,
}
const memoRec = { id: 'X-1', base: 4 }
fieldValue(memoEntity2, memoRec, 'doubled')
fieldValue(memoEntity2, memoRec, 'doubled')
fieldValue(memoEntity2, memoRec, 'doubled')
console.log('0n) Berechnete Memo: Aufrufe fuer 3x fieldValue:', memoCalls)
if (memoCalls !== 1) fail('Berechnetes Feld wurde nicht memoisiert (3 Aufrufe ergaben ' + memoCalls + ')')

/* Formel wirft - Wert leer, Konsole sieht genau eine Warnung. */
const warnings = []
const origWarn = console.warn
console.warn = (msg) => warnings.push(String(msg))
const brokenEntity = {
  schema: {
    idField: 'id', singular: 'item', plural: 'items', titleField: 'title',
    fields: [
      { key: 'input', label: 'Input', type: 'number' },
      { key: 'broken', label: 'Broken', type: 'computed', compute: () => { throw new Error('kaboom') } },
    ],
  },
  isDone: () => false,
  isOverdue: () => false,
}
const brokenRec = { id: 'B-1', input: 1 }
const brokenVal = fieldValue(brokenEntity, brokenRec, 'broken')
console.warn = origWarn
console.log('0o) Werfende Formel: Wert =', JSON.stringify(brokenVal), '| Warnungen:', warnings.length, '| Text:', warnings[0])
if (brokenVal !== '') fail('Werfende Formel hätte leeren Wert liefern müssen, war ' + JSON.stringify(brokenVal))
if (warnings.length !== 1) fail('Genau eine Warnung erwartet, waren ' + warnings.length)
if (!warnings[0].includes('broken') || !warnings[0].includes('B-1') || !warnings[0].includes('kaboom')) {
  fail('Warnung enthaelt nicht Feldname, Record-Id und Fehlertext: ' + warnings[0])
}
/* Zweiter Aufruf mit demselben Datensatz und derselben Ausnahme - keine weitere Warnung. */
const warnings2 = []
console.warn = (msg) => warnings2.push(String(msg))
fieldValue(brokenEntity, brokenRec, 'broken')
fieldValue(brokenEntity, brokenRec, 'broken')
console.warn = origWarn
if (warnings2.length !== 0) fail('Zweite Warnung mit identischem Datensatz und Fehler wurde nicht unterdrueckt')

/* materialize laeuft durch dasselbe Memo, ohne Wert zu wiederholen. */
let matCalls = 0
const matEntity = {
  schema: {
    idField: 'id', singular: 'item', plural: 'items', titleField: 'title',
    fields: [
      { key: 'base', label: 'Base', type: 'number' },
      { key: 'triple', label: 'Triple', type: 'computed', compute: (r) => { matCalls++; return Number(r.base) * 3 } },
    ],
  },
  isDone: () => false,
  isOverdue: () => false,
}
const matRec = { id: 'T-1', base: 5 }
materialize(matEntity, matRec)
materialize(matEntity, matRec)
console.log('0p) materialize-Cache:', matCalls, 'Aufruf(e)')
if (matCalls !== 1) fail('materialize hätte memoisiert (Aufrufe: ' + matCalls + ')')

/* sum und avg ueber ein berechnetes Feld gehen durch die Validation. */
const metricSchema = {
  idField: 'id', singular: 'item', plural: 'items', titleField: 'title',
  facets: [],
  metrics: [
    { op: 'sum', field: 'score', label: 'Total score' },
    { op: 'avg', field: 'score', label: 'Avg score' },
  ],
  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'base', label: 'Base', type: 'number' },
    { key: 'score', label: 'Score', type: 'computed', compute: (r) => Number(r.base) * 3 },
  ],
}
const metricEntity = { schema: metricSchema, isDone: () => false, isOverdue: () => false }
const metricValidation = validateMetrics(metricSchema)
console.log('0q) validateMetrics ueber computed:',
  'metriken:', metricValidation.metrics.length,
  '| beanstandungen:', metricValidation.issues.map((i) => i.code).join(',') || 'keine')
if (metricValidation.issues.some((i) => i.code === 'notNumeric')) fail('validateMetrics wies sum(computed) zurueck')
if (metricValidation.metrics.length !== 2) fail('Erwartet 2 akzeptierte Kennzahlen, waren ' + metricValidation.metrics.length)

const metricRows = [
  { id: 'K-1', title: 'A', base: 2 },
  { id: 'K-2', title: 'B', base: 4 },
  { id: 'K-3', title: 'C', base: 6 },
]
const sumScore = metricValue(metricEntity, metricRows, { op: 'sum', field: 'score' })
const avgScore = metricValue(metricEntity, metricRows, { op: 'avg', field: 'score' })
console.log('0r) sum/avg(computed): Σ =', sumScore, '| Ø =', avgScore)
if (sumScore !== 36) fail('sum(computed) ergab ' + sumScore + ' statt 36')
if (avgScore !== 12) fail('avg(computed) ergab ' + avgScore + ' statt 12')

/* 1000 synthetische Datensaetze - das Memo muss den Render-Pfad spuerbar
   verkuerzen. Ohne Memo wuerde jede Sortier- und Anzeigewelle das Feld fuer
   jeden Datensatz neu rechnen, mit Memo genau einmal pro Datensatz und Feld.
   Hier: 1000 Records, je zwei Felder -> 2000 Aufrufe statt 4000 nach dem
   zweiten Lauf pro Feld. */
const bigEntity = {
  schema: {
    idField: 'id', singular: 'item', plural: 'items', titleField: 'title',
    fields: [
      { key: 'a', label: 'A', type: 'number' },
      { key: 'b', label: 'B', type: 'computed', compute: (r) => Number(r.a) + 1 },
      { key: 'c', label: 'C', type: 'computed', compute: (r) => Number(r.a) * 2 },
    ],
  },
  isDone: () => false,
  isOverdue: () => false,
}
let bigCalls = 0
const bigEntityCounted = {
  schema: {
    idField: 'id', singular: 'item', plural: 'items', titleField: 'title',
    fields: [
      { key: 'a', label: 'A', type: 'number' },
      { key: 'b', label: 'B', type: 'computed', compute: (r) => { bigCalls++; return Number(r.a) + 1 } },
      { key: 'c', label: 'C', type: 'computed', compute: (r) => { bigCalls++; return Number(r.a) * 2 } },
    ],
  },
  isDone: () => false,
  isOverdue: () => false,
}
const bigRecordsMemo = Array.from({ length: 1000 }, (_, i) => ({ id: 'M-' + i, a: i }))
const bigRecordsCounted = Array.from({ length: 1000 }, (_, i) => ({ id: 'C-' + i, a: i }))
const t0 = performance.now()
for (const r of bigRecordsMemo) {
  fieldValue(bigEntity, r, 'b')
  fieldValue(bigEntity, r, 'c')
}
const t1 = performance.now()
/* Vier Aufrufe pro Record, einer doppelt: ohne Cache 4x, mit Cache 2x pro Record.
   Wir messen das Verhaeltnis. */
for (const r of bigRecordsCounted) {
  fieldValue(bigEntityCounted, r, 'b')
  fieldValue(bigEntityCounted, r, 'c')
  fieldValue(bigEntityCounted, r, 'b')
  fieldValue(bigEntityCounted, r, 'c')
}
const t2 = performance.now()
const expectedCalls = 2000 /* 1000 Records x 2 Felder, zweite Welle aus dem Memo */
console.log(`0s) 1000 Datensaetze: memoisiert 2x (${(t1 - t0).toFixed(1)} ms) | 4x mit Memo-Schutz = ${bigCalls}/${expectedCalls} compute-Aufrufe in ${(t2 - t1).toFixed(1)} ms`)
if (bigCalls !== expectedCalls) fail('Memo verhindert nicht den Wiederholungsaufruf: ' + bigCalls + ' statt ' + + expectedCalls)
if ((t1 - t0) > 500) fail('1000x2 berechnete Feldaufrufe brauchen deutlich zu lange: ' + (t1 - t0).toFixed(1) + ' ms')

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

await openList(page, dist)

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

/*
 * Sortierung (OPEN-18): Dreiklang auf/ab/Zurück am Spaltenkopf, Zahlen
 * numerisch statt wortweise. Der dritte Klick auf denselben Kopf stellt die
 * Datenblock-Reihenfolge wieder her - der Pfeil verschwindet, aria-sort mit.
 */
const headD = page.getByRole('columnheader', { name: /^D\b/ })
const effortCells = () =>
  page
    .locator('td.cell-num:not(.cell-computed)')
    .allInnerTexts()
    .then((t) => t.join())
await headD.click()
const effortAsc = await effortCells()
console.log('1d) Aufwand nach 1. Klick:', effortAsc, '| aria-sort:', await headD.getAttribute('aria-sort'))
if (effortAsc !== '1,2,3,4,5,6,8,10,12,16,20') fail('Aufwand nicht numerisch aufsteigend (10 hinter 9) sortiert')
if ((await headD.getAttribute('aria-sort')) !== 'ascending') fail('Erster Klick muss aufsteigend sortieren')
await headD.click()
const effortDesc = await effortCells()
console.log('    Nach 2. Klick:', effortDesc, '| aria-sort:', await headD.getAttribute('aria-sort'))
if (effortDesc !== '20,16,12,10,8,6,5,4,3,2,1') fail('Zweiter Klick muss absteigend sortieren')
if ((await headD.getAttribute('aria-sort')) !== 'descending') fail('aria-sort meldet nicht absteigend')
await headD.click()
const dataOrder = await page.locator('td.cell-id').allInnerTexts()
console.log('1e) Nach 3. Klick zurück auf Datenblock-Reihenfolge:', dataOrder.join(','), '| aria-sort:', await headD.getAttribute('aria-sort'))
if (dataOrder.join() !== Array.from({ length: 11 }, (_, i) => 'A-' + (1041 + i)).join()) {
  fail('Dritter Klick hat nicht zur Datenblock-Reihenfolge zurückgestellt')
}
if ((await headD.getAttribute('aria-sort')) !== null) fail('Nach dem dritten Klick darf kein Sortierindikator bleiben')

// Datumschronologie: der Kopf sortiert nach dem ISO-Wert, nicht nach der
// angezeigten Schreibweise.
const headDue = page.getByRole('columnheader', { name: /^Due/ })
await headDue.click()
const dueSequence = (await page.locator('td.cell-date').allInnerTexts()).map((t) => {
  const [m, d, y] = t.split('/')
  return `${y}-${m}-${d}`
})
const dueAscending = dueSequence.every((s, i, a) => i === 0 || a[i - 1] <= s)
console.log('1f) Fälligkeit chronologisch:', dueSequence.join(' '), '| aufsteigend:', dueAscending)
if (!dueAscending) fail('Datums-Sortierung folgt nicht der Chronologie')

// Leerwerte stehen in BEIDEN Richtungen unten - die erledigten Punkte ohne
// Restlaufzeit dürfen nie über den befüllten Werten liegen.
const headLeft = page.getByRole('columnheader', { name: /^Left/ })
await headLeft.click()
const leftAsc = await page.locator('td.cell-computed').allInnerTexts()
await headLeft.click()
const leftDesc = await page.locator('td.cell-computed').allInnerTexts()
const blanksAtBottom = (cells) => cells.slice(-2).every((t) => t === '—')
console.log('1g) Restlaufzeit absteigend:', leftDesc.join(' '), '| Leerwerte unten:',
  blanksAtBottom(leftAsc), '/', blanksAtBottom(leftDesc))
if (!blanksAtBottom(leftAsc)) fail('Leerwerte liegen bei aufsteigender Sortierung nicht unten')
if (!blanksAtBottom(leftDesc)) fail('Leerwerte rutschen bei absteigender Sortierung nach oben')
await headLeft.click()

// Neuen Datensatz anlegen
await page.getByRole('button', { name: 'New action item' }).first().click()
await page.waitForSelector('.drawer')
await formFocused(page)
await page.locator('#f-title').fill('Smoke test entry')
await page.locator('#f-owner').fill('QA')
await page.locator('#f-due').fill('2026-12-01')
await page.getByRole('button', { name: 'Apply' }).click()
const rows2 = await page.locator('table tbody tr').count()
console.log('2) Datensatz angelegt — Zeilen:', rows2)
if (rows2 !== 12) fail('Anlegen hat nicht gegriffen')

/*
 * Undo/Redo: Anlegen rueckgaengig machen und wiederholen, per Knopf und per
 * Tastenkuerzel. Deckt Akzeptanzkriterium 1 ("Anlegen -> Rueckgaengig ->
 * Datensatz ist weg; Wiederholen -> Datensatz ist wieder da") ab.
 */
await page.locator('.filebar__history-btn').first().click()
const rowsAfterUndo = await page.locator('table tbody tr').count()
const goneAfterUndo = (await page.getByText('Smoke test entry').count()) === 0
console.log('2a) Anlegen rueckgaengig — Zeilen:', rowsAfterUndo, '| Eintrag weg:', goneAfterUndo)
if (rowsAfterUndo !== 11 || !goneAfterUndo) fail('Rueckgaengig hat die Neuanlage nicht zurueckgenommen')

await page.locator('.filebar__history-btn').nth(1).click()
const rowsAfterRedo = await page.locator('table tbody tr').count()
const backAfterRedo = (await page.getByText('Smoke test entry').count()) === 1
console.log('2b) Wiederholen — Zeilen:', rowsAfterRedo, '| Eintrag zurueck:', backAfterRedo)
if (rowsAfterRedo !== 12 || !backAfterRedo) fail('Wiederholen hat die Neuanlage nicht zurueckgebracht')

// Dasselbe ueber Strg+Z / Strg+Y statt der Knoepfe.
await page.keyboard.press('Control+z')
const rowsAfterCtrlZ = await page.locator('table tbody tr').count()
console.log('2c) Strg+Z — Zeilen:', rowsAfterCtrlZ)
if (rowsAfterCtrlZ !== 11) fail('Tastenkuerzel Strg+Z hat nicht rueckgaengig gemacht')
await page.keyboard.press('Control+y')
const rowsAfterCtrlY = await page.locator('table tbody tr').count()
console.log('    Strg+Y — Zeilen:', rowsAfterCtrlY)
if (rowsAfterCtrlY !== 12) fail('Tastenkuerzel Strg+Y hat nicht wiederholt')

/*
 * Loeschen rueckgaengig machen: der Datensatz muss mit denselben Werten
 * zurueckkommen, nicht nur die Zeilenzahl stimmen.
 */
await page.getByText('Smoke test entry').click()
await page.waitForSelector('.drawer')
await page.getByRole('button', { name: 'Delete', exact: true }).click()
await page.getByRole('button', { name: 'Confirm delete' }).click()
const rowsAfterDelete = await page.locator('table tbody tr').count()
console.log('2d) Geloescht — Zeilen:', rowsAfterDelete)
if (rowsAfterDelete !== 11) fail('Loeschen hat nicht gegriffen')

await page.locator('.filebar__history-btn').first().click()
const rowsAfterUndoDelete = await page.locator('table tbody tr').count()
const restoredOwner = await page.locator('tr:has-text("Smoke test entry")').innerText()
console.log('2e) Loeschen rueckgaengig — Zeilen:', rowsAfterUndoDelete, '| Zeile:', restoredOwner.replace(/\s+/g, ' '))
if (rowsAfterUndoDelete !== 12) fail('Rueckgaengig hat das Loeschen nicht zurueckgenommen')
if (!restoredOwner.includes('QA')) fail('Wiederhergestellter Datensatz hat seine Werte verloren')

// Redo-Verlauf wird durch eine neue Aenderung verworfen, wie in jedem Editor -
// nicht nur geleert, weil das Loeschen wiederholt wurde.
if (await page.locator('.filebar__history-btn').nth(1).isDisabled()) {
  fail('Redo sollte nach dem letzten Rueckgaengig verfuegbar sein')
}

/*
 * Editieren rueckgaengig machen: der alte Feldwert muss zurueckkommen, nicht
 * nur die Knopfzustaende sich aendern - dasselbe Muster wie beim Loeschen
 * (2d/2e). Zugriff ueber den Titel "Smoke test entry", nicht ueber "erste
 * Zeile": die Sortierung kann sich zwischen den Schritten aendern, ein
 * Bezeichner nicht.
 */
await page.locator('tr:has-text("Smoke test entry")').locator('.cell-id').click()
await page.waitForSelector('.drawer')
await formFocused(page)
await page.locator('#f-owner').fill('New owner after undo')
// Negativfall des Fokus-Rennens (OPEN-43): Die Eingabe darf nur im
// Verantwortlichen-Feld gelandet sein - klebte sie am Titelfeld, trüge der
// Datensatz fortan einen verunstalteten Titel und Schritt 2m suchte eine
// Kopie, die so nie existierte. Diese Zusicherung schlaegt am Ort der
// Ursache an, nicht sechs Schritte spaeter.
if ((await page.locator('#f-title').inputValue()) !== 'Smoke test entry') {
  fail('Der Startfokus hat dem Ausfuellen in das Titelfeld geschrieben')
}
await page.getByRole('button', { name: 'Apply' }).click()
const editedRow = await page.locator('tr:has-text("Smoke test entry")').innerText()
console.log('2f) Editiert — Zeile:', editedRow.replace(/\s+/g, ' '))
if (!editedRow.includes('New owner after undo')) fail('Editieren hat nicht gegriffen')
if (!editedRow.replace(/\s+/g, ' ').includes('Smoke test entry ')) {
  fail('Editieren hat den Titel des Datensatzes angefasst')
}
if (!(await page.locator('.filebar__history-btn').nth(1).isDisabled())) {
  fail('Eine neue Aenderung haette den Redo-Verlauf leeren muessen')
}

await page.locator('.filebar__history-btn').first().click()
const revertedRow = await page.locator('tr:has-text("Smoke test entry")').innerText()
console.log('2g) Editieren rueckgaengig — Zeile:', revertedRow.replace(/\s+/g, ' '))
if (!revertedRow.includes('QA')) fail('Rueckgaengig hat den alten Feldwert nicht wiederhergestellt')
if (revertedRow.includes('New owner after undo')) fail('Rueckgaengig hat den neuen Feldwert nicht entfernt')

await page.locator('.filebar__history-btn').nth(1).click()
const redoneRow = await page.locator('tr:has-text("Smoke test entry")').innerText()
console.log('    Editieren wiederholt — Zeile:', redoneRow.replace(/\s+/g, ' '))
if (!redoneRow.includes('New owner after undo')) fail('Wiederholen hat den neuen Feldwert nicht zurueckgebracht')

/*
 * Mehrfachauswahl und Sammelaktionen (OPEN-19). Der Zustandsstand wird je
 * Schritt ueber die Id-Zelle eingesammelt, nicht ueber die Position - die
 * Reihenfolge in der Tabelle haengt an der laufenden Sortierung, eine Id nicht.
 */
const statusMap = async () =>
  Object.fromEntries(
    await Promise.all(
      (await page.locator('table tbody tr').all()).map(async (tr) => [
        (await tr.locator('.cell-id').innerText()).trim(),
        (await tr.locator('.pill').innerText()).trim(),
      ]),
    ),
  )
const bulkCounter = () => page.locator('.bulk-bar__count').innerText()

// Ohne Auswahl gibt es keine Aktionsleiste - sie blendet sich zu.
if (await page.locator('.bulk-bar').count()) {
  fail('Aktionsleiste steht, ohne dass etwas ausgewaehlt ist')
}

// 2h) Bereichsauswahl: erster Klick setzt den Anker, Umschalt-Klick den Bereich.
const rowCheck = (i) => page.locator('table tbody tr').nth(i).locator('.td-check input')
await rowCheck(0).click()
let bulkShown = await bulkCounter()
console.log('2h) Erste Auswahl:', bulkShown)
if (!bulkShown.startsWith('1')) fail('Zaehler zeigt nach dem ersten Klick nicht 1')

await rowCheck(3).click({ modifiers: ['Shift'] })
bulkShown = await bulkCounter()
console.log('    Umschalt-Klick auf Zeile 4:', bulkShown)
if (!bulkShown.startsWith('4')) fail('Bereichsauswahl hat nicht genau die Zeilen 1 bis 4 erfasst')

const headCheck = page.locator('.th-check input')
if (!(await headCheck.evaluate((el) => el.indeterminate))) {
  fail('Kopfkontrollkaestchen zeigt bei Teilauswahl keinen unbestimmten Zustand')
}

// Alles-auswählen trifft genau die sichtbare Seite, derselbe Schalter hebt ab.
await headCheck.click()
const visibleCount = await page.locator('table tbody tr').count()
bulkShown = await bulkCounter()
console.log(`    Alles auswaehlen (${visibleCount} sichtbar):`, bulkShown)
if (!bulkShown.startsWith(String(visibleCount))) fail('Alles-auswaehlen hat nicht alle sichtbaren Zeilen erfasst')
await headCheck.click()
if (await page.locator('.bulk-bar').count()) fail('Auswahl aufheben ueber den Kopf hat nicht geleert')

// 2i) Sammelaktion: Wert setzen. EIN Strg+Z stellt alle vorherigen Werte her.
const SET_ROWS = ['Review interface error returns', 'Start Q3 access recertification']
for (const title of SET_ROWS) {
  await page.locator(`tr:has-text("${title}") .td-check input`).click()
}
const beforeBulk = await statusMap()
await page.locator('.bulk-bar select').nth(0).selectOption({ label: 'Status' })
await page.locator('.bulk-bar select').nth(1).selectOption('done')
await page.getByRole('button', { name: 'Set value' }).click()
await page.waitForSelector('.toast')
const bulkToast = await page.locator('.toast').innerText()
console.log('2i) Sammelaktion:', bulkToast)
if (!/^2 /.test(bulkToast)) fail('Sammelaktion meldet nicht genau 2 aktualisierte Datensaetze')
for (const title of SET_ROWS) {
  const pill = (await page.locator(`tr:has-text("${title}") .pill`).innerText()).trim()
  if (pill !== 'done') fail(`"${title}" wurde nicht auf done gesetzt`)
}
await page.keyboard.press('Control+z')
const restoredBulk = await statusMap()
console.log(
  '    Nach einem Strg+Z identisch zum Ausgangsstand:',
  JSON.stringify(restoredBulk) === JSON.stringify(beforeBulk),
)
if (JSON.stringify(restoredBulk) !== JSON.stringify(beforeBulk)) {
  fail('Ein Strg+Z hat die Sammelaktion nicht vollstaendig rueckgaengig gemacht')
}

// 2j) Abbruch der Rueckfrage: Daten unangetastet, Auswahl bleibt stehen.
await page.locator(`tr:has-text("${SET_ROWS[0]}") .td-check input`).click()
await page.getByRole('button', { name: 'Delete selected' }).click()
await page.waitForSelector('.modal')
const cancelBody = await page.locator('.modal').innerText()
console.log('2j) Rueckfrage nennt Anzahl:', cancelBody.includes('1 record will be removed'))
if (!cancelBody.includes('1 record will be removed')) fail('Die Rueckfrage nennt die Anzahl nicht')
await page.locator('.modal .btn--quiet').click()
const rowsAfterCancel = await page.locator('table tbody tr').count()
if (rowsAfterCancel !== 12) fail('Abbruch hat doch etwas geloescht')
if (!(await page.locator('.bulk-bar').count())) fail('Abbruch hat die Auswahl mit weggeworfen')

// Der dritte Balken-Knopf: Auswahl aufheben.
await page.getByRole('button', { name: 'Clear selection' }).click()
if (await page.locator('.bulk-bar').count()) fail('Auswahl aufheben hat nicht geleert')

// 2k) Sammel-Loeschen mit Bestätigung; ein Strg+Z bringt beide zurück.
const DELETE_TITLES = ['Refresh chapter 4 of the continuity handbook', 'Recalibrate monitoring thresholds']
const deletedIds = []
for (const title of DELETE_TITLES) {
  deletedIds.push((await page.locator(`tr:has-text("${title}") .cell-id`).innerText()).trim())
  await page.locator(`tr:has-text("${title}") .td-check input`).click()
}
await page.getByRole('button', { name: 'Delete selected' }).click()
await page.waitForSelector('.modal')
await page.locator('.modal .btn--danger').click()
await page.waitForSelector('.toast')
const deleteToast = await page.locator('.toast').innerText()
const rowsAfterBulkDelete = await page.locator('table tbody tr').count()
console.log('2k) Sammel-Loeschen:', deleteToast, '| Zeilen:', rowsAfterBulkDelete)
if (!/^2 /.test(deleteToast)) fail('Loeschmeldung zaehlt nicht genau 2 Datensaetze')
if (rowsAfterBulkDelete !== 10) fail('Sammel-Loeschen hat nicht genau 2 Zeilen entfernt')
for (const id of deletedIds) {
  if (await page.locator(`td.cell-id:text-is("${id}")`).count()) {
    fail(`Datensatz ${id} wurde nicht geloescht`)
  }
}
await page.keyboard.press('Control+z')
const rowsAfterUndoBulkDelete = await page.locator('table tbody tr').count()
const bothBack = await Promise.all(
  deletedIds.map((id) => page.locator(`td.cell-id:text-is("${id}")`).count()),
)
console.log('    Ein Strg+Z danach — Zeilen:', rowsAfterUndoBulkDelete, '| beide zurueck:', bothBack.every((n) => n === 1))
if (rowsAfterUndoBulkDelete !== 12 || !bothBack.every((n) => n === 1)) {
  fail('Ein Strg+Z hat das Sammel-Loeschen nicht vollstaendig rueckgaengig gemacht')
}

// 2l) Schema-Regeln gelten fuer die Sammelaktion genauso: ohne Verantwortlicher
// kein "in progress" - der Datensatz wird benannt und uebersprungen, der
// Nachbar daneben wird regulär gesetzt.
await page.getByRole('button', { name: 'New action item' }).first().click()
await page.locator('#f-title').fill('Bulk rule probe')
await page.getByRole('button', { name: 'Apply' }).click()
await page.locator('tr:has-text("Bulk rule probe") .td-check input').click()
await page.locator('tr:has-text("Consolidate the process map") .td-check input').click()
await page.locator('.bulk-bar select').nth(0).selectOption({ label: 'Status' })
await page.locator('.bulk-bar select').nth(1).selectOption('in progress')
await page.getByRole('button', { name: 'Set value' }).click()
await page.waitForSelector('.toast')
const ruleToast = await page.locator('.toast').innerText()
console.log('2l) Regel-Beanstandung:', ruleToast)
if (!ruleToast.includes('1 not changed') || !ruleToast.includes('needs an owner')) {
  fail('Der regelwidrige Datensatz wurde nicht benannt und uebersprungen')
}
const neighborPill = (await page.locator('tr:has-text("Consolidate the process map") .pill').innerText()).trim()
const probePill = (await page.locator('tr:has-text("Bulk rule probe") .pill').innerText()).trim()
if (neighborPill !== 'in progress') fail('Der zulässige Nachbar wurde nicht mitgesetzt')
if (probePill !== 'open') fail('Der regelwidrige Datensatz wurde trotzdem geändert')

// Aufräumen über denselben Verlauf: zwei Schritte, Ausgangszustand für die
// Speicher-Prüfungen unten.
await page.keyboard.press('Control+z')
await page.keyboard.press('Control+z')
const rowsCleanedUp = await page.locator('table tbody tr').count()
if (rowsCleanedUp !== 12) fail('Aufraeumen hat nicht den Ausgangszustand wiederhergestellt')

/*
 * Duplizieren (OPEN-20): Kopie über die Zeilenaktion und über das geöffnete
 * Formular, jeweils mit Namenszusatz, eigener Id und auf dem Undo-Stapel.
 * Zugriff über den Titel als Bezeichner - nicht über "erste Zeile", denn die
 * Sortierung kann sich zwischen den Schritten ändern.
 */
const sourceId = await page.locator('tr:has-text("Smoke test entry")').locator('.cell-id').innerText()
await page.locator('tr:has-text("Smoke test entry") .cell-action button').click()

const rowsAfterDuplicate = await page.locator('table tbody tr').count()
console.log('2m) Dupliziert (Zeilenaktion) — Zeilen:', rowsAfterDuplicate)
if (rowsAfterDuplicate !== 13) fail('Duplizieren hat keinen Datensatz angelegt')

const copyRow = page.locator('tr:has-text("Smoke test entry (Copy)")')
if ((await copyRow.count()) !== 1) {
  const dump = await page.evaluate(() => ({
    zeilen: [...document.querySelectorAll('table tbody tr')].map((tr) =>
      tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 100),
    ),
    bulkBar: !!document.querySelector('.bulk-bar'),
    toast: document.querySelector('.toast')?.textContent ?? null,
    drawerTitel: document.querySelector('.drawer input, .drawer output, .drawer h2')?.textContent ?? null,
    suche: document.querySelector('.search input, input[type="search"]')?.value ?? null,
  }))
  fail(`Kopie fehlt oder liegt doppelt — copyCount=${await copyRow.count()} zustand=${JSON.stringify(dump)}`)
}
const copyValues = await copyRow.innerText()
if (!copyValues.includes('New owner after undo')) fail('Kopie hat die Feldwerte des Originals nicht uebernommen')
const copyId = await copyRow.locator('.cell-id').innerText()
if (copyId === sourceId) fail('Kopie traegt dieselbe Id wie das Original')
if ((await page.locator('tr:has-text("Smoke test entry")').count()) !== 2) fail('Original ist durch das Duplizieren veraendert oder verschwunden')

// Nach dem Anlegen steht das Formular der Kopie offen, nicht das des Originals.
const dupDrawerId = await page.locator('.drawer__head .cell-id').innerText()
if (dupDrawerId !== copyId) fail('Nach dem Duplizieren oeffnet nicht das Formular der Kopie')
const dupDrawerTitle = await page.locator('#f-title').inputValue()
if (dupDrawerTitle !== 'Smoke test entry (Copy)') fail('Titelfeld der Kopie traegt den Namenszusatz nicht')

await page.keyboard.press('Escape')
await page.keyboard.press('Control+z')
const rowsAfterUndoDuplicate = await page.locator('table tbody tr').count()
const copyGone = (await page.locator('tr:has-text("Smoke test entry (Copy)")').count()) === 0
console.log('2n) Duplikat rueckgaengig — Zeilen:', rowsAfterUndoDuplicate, '| Kopie weg:', copyGone)
if (rowsAfterUndoDuplicate !== 12 || !copyGone) fail('Strg+Z hat die Kopie nicht vollstaendig entfernt')

// Dieselbe Aktion aus dem geöffneten Formular heraus.
await page.locator('tr:has-text("Smoke test entry") .cell-id').click()
await page.waitForSelector('.drawer')
await page.getByRole('button', { name: 'Duplicate', exact: true }).click()
const rowsAfterDrawerDuplicate = await page.locator('table tbody tr').count()
const secondCopyId = await page.locator('.drawer__head .cell-id').innerText()
console.log('2o) Dupliziert (Formular) — Zeilen:', rowsAfterDrawerDuplicate, '| neue Id:', secondCopyId)
if (rowsAfterDrawerDuplicate !== 13) fail('Duplizieren aus dem Formular hat keinen Datensatz angelegt')
if (secondCopyId === sourceId || secondCopyId === copyId) {
  fail('Formular zeigt nach dem Duplizieren nicht die frische Kopie')
}
if ((await page.locator('#f-title').inputValue()) !== 'Smoke test entry (Copy)') {
  fail('Kopie aus dem Formular traegt den Namenszusatz nicht')
}

// Ein neuer, noch nie gespeicherter Entwurf bietet Duplizieren nicht an -
// es gibt nichts, das man kopieren koennte.
await page.keyboard.press('Escape')
await page.getByRole('button', { name: 'New action item' }).first().click()
await page.waitForSelector('.drawer')
if (await page.getByRole('button', { name: 'Duplicate', exact: true }).count()) {
  fail('Ein neuer Entwurf darf keine Duplizieren-Aktion anbieten')
}
await page.keyboard.press('Escape')

/* Unspeicherte Kopien verhalten sich wie jeder neue Datensatz: ohne
   Speichern ueberlebt ein Neuladen sie nicht. Frische Seite, weil die alte
   nach Strg+Z oben ohnehin wieder bei 12 Zeilen steht. */
await page.keyboard.press('Control+z')
const rowsAfterSecondUndo = await page.locator('table tbody tr').count()
if (rowsAfterSecondUndo !== 12) fail('Strg+Z hat das zweite Duplikat nicht entfernt')
const pageFresh = await ctx.newPage()
pageFresh.on('pageerror', (e) => errors.push(String(e)))
await openList(pageFresh, dist)
const freshRows = await pageFresh.locator('table tbody tr').count()
const freshCopies = await pageFresh.locator('tr:has-text("(Copy)")').count()
console.log('2p) Neuladen ohne Speichern — Zeilen:', freshRows, '| Kopien:', freshCopies)
if (freshRows !== 11 || freshCopies !== 0) fail('Unspeicherte Kopie hat ein Neuladen ueberlebt')
await pageFresh.close()

// Speichern (ohne File System Access API -> Download-Pfad)
const saved = resolve(tmp, 'runde1.html')
const dl = await saveTo(page, saved, 'Testeintrag angelegt')
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

/*
 * Duplizieren und Protokoll (OPEN-20): eine Kopie, die den Speichertermin
 * erlebt, muss im Änderungsprotokoll als Anlegen-Ereignis stehen - abgeleitet
 * gegen den letzten Stand, nicht eingetippt. Danach wird sie zurückgenommen
 * und neu gespeichert, damit der weitere Ablauf wieder vom alten Datenstand
 * ausgeht und keine der folgenden Zeilenzählungen kippt.
 */
await page.locator('tr:has-text("Smoke test entry") .cell-action button').click()
await page.waitForSelector('.drawer')
const loggedCopyId = await page.locator('.drawer__head .cell-id').innerText()
await page.keyboard.press('Escape')
await saveTo(page, saved, 'Kopie fuer das Protokoll')
const savedLog = JSON.parse(
  readFileSync(saved, 'utf8').match(/<script id="sb-payload"[^>]*>([\s\S]*?)<\/script>/)[1],
)
const copyCreated = (savedLog.data?.log ?? [])
  .flatMap((entry) => entry.changes ?? [])
  .filter((c) => c.op === 'created' && String(c.id) === String(loggedCopyId))
console.log('3b) Protokoll: Anlegen-Ereignis der Kopie:', copyCreated.length ? copyCreated[0].title : 'fehlt')
if (copyCreated.length !== 1) fail('Die Kopie fehlt als Anlegen-Ereignis im Änderungsprotokoll')
if (copyCreated[0].title !== 'Smoke test entry (Copy)') {
  fail('Anlegen-Ereignis trägt nicht den Titel der Kopie')
}

await page.keyboard.press('Control+z')
const rowsAfterLogUndo = await page.locator('table tbody tr').count()
if (rowsAfterLogUndo !== 12) fail('Ruecknahme der Protokoll-Kopie hat nicht gegriffen')
await saveTo(page, saved, 'Kopie zurueckgenommen')

// Wiederöffnen: kommt der Datenstand zurück?
const page2 = await ctx.newPage()
page2.on('pageerror', (e) => errors.push(String(e)))
await openList(page2, saved)
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
const sealed = resolve(tmp, 'runde2-verschluesselt.html')
await saveTo(page2, sealed, 'verschluesselt')
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
await page3.waitForSelector('.home, table tbody tr', { timeout: 15000 })
if (await page3.locator('.home').count()) await page3.locator('.home__foot .btn--primary').click()
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
const runde3 = resolve(tmp, 'runde3.html')
await saveTo(page3, runde3, 'Einstellungen geaendert')

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
await openList(page5, dist)
await page5.getByLabel('Settings').click()
await page5.waitForSelector('.settings')
await page5.getByText('off', { exact: true }).click()
await page5.waitForSelector('input[placeholder="https://…/openai/v1"]')
await page5.locator('input[placeholder="https://…/openai/v1"]').fill(mockBase + '/v1')
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
const klartext = resolve(tmp, 'runde4-ohne-key.html')
await saveTo(page5, klartext, 'ohne Schluessel')
const klartextSrc = readFileSync(klartext, 'utf8')
const keyLeak = klartextSrc.includes('test-key')
console.log('15) API-Schlüssel ohne Haken in der Datei auffindbar:', keyLeak)
if (keyLeak) fail('API-Schluessel wurde ungefragt gespeichert')
console.log('16) Dialekt in der Datei hinterlegt:', klartextSrc.includes('max_completion_tokens'))
if (!klartextSrc.includes('max_completion_tokens')) fail('Dialekt wurde nicht mitgespeichert')
const settingsKept = klartextSrc.includes('mock-model') && klartextSrc.includes(mockBase)
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
const mitKey = resolve(tmp, 'runde5-mit-key.html')
await saveTo(page5, mitKey, 'mit Schluessel')
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
await openList(page9, dist)
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

/*
 * Direktprüfung des SVG-Reinigers (OPEN-71): die E2E-Prüfung weiter unten sieht
 * nur den gerenderten DOM. Hier zählt, WAS der Reiniger als entfernt meldet,
 * und dass legitime Grafik unangetastet bleibt. Das Modul braucht DOMParser und
 * läuft deshalb im Seitenkontext; der Quelltext kommt unverändert aus
 * src/lib/svg.js, nur die export-Markierung ist für new Function zu lösen.
 */
const sanitizerSource = readFileSync(resolve(root, 'src/lib/svg.js'), 'utf8')
const runSanitizer = (input) =>
  page9.evaluate(({ src, input }) => {
    const make = new Function(src.replace(/^export /gm, '') + '\nreturn sanitizeSvg')
    return make()(input)
  }, { src: sanitizerSource, input })

const styleElSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
  '<style>@import url("https://attacker.example/track.css"); rect { fill: #f00 }</style>' +
  '<rect width="10" height="10"/></svg>'
const styleAttrSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
  '<rect width="10" height="10" style=\'fill:url("https://attacker.example/x");stroke:#333\'/></svg>'
const styleRootSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" style=\'fill:url("https://attacker.example/root")\'>' +
  '<rect width="10" height="10"/></svg>'
const legitSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
  '<defs><linearGradient id="g"><stop offset="0" stop-color="#0e7c86"/><stop offset="1" stop-color="#8a2f5a"/></linearGradient></defs>' +
  '<rect width="10" height="10" fill="url(#g)" stroke="#123456"/></svg>'

const cleanedEl = await runSanitizer(styleElSvg)
const cleanedAttr = await runSanitizer(styleAttrSvg)
const cleanedRoot = await runSanitizer(styleRootSvg)
const keptLegit = await runSanitizer(legitSvg)
console.log(
  '27a) Direktprüfung — style-Element:', JSON.stringify(cleanedEl.removed),
  '| style-Attribut:', JSON.stringify(cleanedAttr.removed),
  '| style am Wurzelelement:', JSON.stringify(cleanedRoot.removed),
  '| legitim:', JSON.stringify(keptLegit.removed),
)
if (!cleanedEl.removed.includes('style')) fail('Das <style>-Element wurde nicht als entfernt gemeldet')
if (/attacker\.example|<style|@import/i.test(cleanedEl.svg)) {
  fail('Der Inhalt eines <style>-Elements hat den Reiniger überlebt')
}
if (!cleanedAttr.removed.includes('style')) fail('Das style-Attribut mit externer url() wurde nicht entfernt')
if (/attacker\.example|url\(/i.test(cleanedAttr.svg)) {
  fail('Ein externer CSS-Verweis im style-Attribut hat den Reiniger überlebt')
}
if (!cleanedRoot.removed.includes('style') && /attacker\.example/.test(cleanedRoot.svg)) {
  fail('Ein externer CSS-Verweis am Wurzelelement hat den Reiniger überlebt')
}
if (
  keptLegit.removed.length ||
  !keptLegit.svg.includes('fill="url(#g)"') ||
  !keptLegit.svg.includes('linearGradient') ||
  !keptLegit.svg.includes('stroke="#123456"')
) {
  fail('Legitime SVG-Grafik wurde verändert oder beschädigt')
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
// OPEN-71: auch die CSS-Vektoren duerfen das hochgeladene Logo ueberleben -
// weder ein <style>-Element noch irgendein externer Verweis im Markup.
const logoStyleCount = await page9.evaluate(() => document.querySelectorAll('.wordmark--logo style').length)
const logoMarkup = await page9.evaluate(() =>
  [...document.querySelectorAll('.wordmark--logo')].map((el) => el.innerHTML).join('\n'),
)
console.log('    <style> im gerenderten Logo:', logoStyleCount, '| externe Verweise:', /attacker\.example/.test(logoMarkup))
if (logoStyleCount) fail('Ein <style>-Element hat das hochgeladene Logo überlebt')
if (/attacker\.example/.test(logoMarkup)) fail('Ein externer CSS-Verweis hat das hochgeladene Logo überlebt')
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
await openList(page10, dist)
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
await openList(page11, dist)
await page11.waitForTimeout(400)
console.log('31) Zaehler vorbelegt:', countHits.length, 'Aufruf |', countHits[0] ?? '-')
if (countHits.length !== 1) fail('Aufrufzaehler hat nicht gezaehlt')
if (!countHits[0]?.includes('p=opentoolbox')) fail('Zaehlpfad fehlt')
if (countHits[0]?.includes('action-items')) fail('Dateiname darf nicht im Zaehlaufruf stehen')

await page11.getByLabel('Settings').click()
await page11.waitForSelector('.settings')
await page11.locator('input[placeholder="empty — count nothing"]').fill('https://zaehler.intern/count')
const ownCounter = resolve(tmp, 'zaehler-eigen.html')
await saveTo(page11, ownCounter, 'eigener Zaehler')

const page12 = await ctx.newPage()
page12.on('pageerror', (e) => errors.push(String(e)))
const ownHits = await countSpy(page12)
await openList(page12, ownCounter)
await page12.waitForTimeout(400)
console.log('32) Eigener Endpunkt:', ownHits[0] ?? '-')
if (!ownHits[0]?.startsWith('https://zaehler.intern/')) fail('Eigener Zaehl-Endpunkt reist nicht mit')

await page12.getByLabel('Settings').click()
await page12.waitForSelector('.settings')
await page12.getByText('counting', { exact: true }).click()
await page12.waitForTimeout(200)
const offCounter = resolve(tmp, 'zaehler-aus.html')
await saveTo(page12, offCounter, 'Zaehler aus')

const page13 = await ctx.newPage()
page13.on('pageerror', (e) => errors.push(String(e)))
let foreignRequests = 0
page13.on('request', (r) => {
  if (!r.url().startsWith('file://') && !r.url().startsWith('data:')) foreignRequests++
})
await openList(page13, offCounter)
await page13.waitForTimeout(400)
console.log('33) Abgeschaltet — fremde Requests insgesamt:', foreignRequests)
if (foreignRequests !== 0) fail('Abgeschalteter Zaehler oeffnet trotzdem eine Verbindung')

// Dashboard: Kacheln aus dem DASHBOARD-Export, Zahlen muessen zur Seitenleiste
// passen, Ring und Legende muessen dieselbe Summe zeigen wie die Datensaetze.
const page14 = await ctx.newPage()
page14.on('pageerror', (e) => errors.push(String(e)))
page14.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(page14, dist)
const railOverdue = await page14.locator('.kpi .is-flag dd').innerText()

await page14.getByRole('tab', { name: 'Dashboard' }).click()
await page14.waitForSelector('.dashboard')
const tileCount = await page14.locator('.tile').count()
const statValues = await page14.locator('.tile--stat .tile__value').allInnerTexts()
console.log('34) Dashboard-Kacheln:', tileCount, '| Kennzahlen:', statValues.join(' '))
if (tileCount !== 6) fail('Erwartet 6 Kacheln aus dem DASHBOARD-Export')
if (statValues[0] !== '11') fail('Anzahl-Kachel stimmt nicht mit dem Bestand ueberein')
if (statValues[1] !== railOverdue) fail('Ueberfaellig-Kachel weicht von der Seitenleiste ab')

// Negativfall: src/domain.js deklariert kein dueDate (das Feld "due" existiert,
// wird aber nicht als solches benannt) - das Faelligkeiten-Widget darf hier
// schlicht nicht existieren, das Dashboard bleibt exakt wie zuvor.
const dueWidgetCount = await page14.locator('.due-widget').count()
console.log('34a) Faelligkeiten-Widget ohne dueDate-Deklaration:', dueWidgetCount)
if (dueWidgetCount !== 0) fail('Widget erscheint, obwohl die Domaene kein dueDate deklariert')

// Derselbe Negativfall fuer die Kennzahl-Kacheln: ohne metrics-Deklaration
// rendert das Dashboard exakt die bisherigen Kacheln, keine dazu.
const metricTileCount = await page14.locator('.tile--metric').count()
console.log('34b) Kennzahl-Kacheln ohne metrics-Deklaration:', metricTileCount)
if (metricTileCount !== 0) fail('Kennzahl-Kacheln erscheinen, obwohl die Domaene keine metrics deklariert')

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
// ein Ende der Reihe im Hintergrund. Seit OPEN-103 sind die Balken Inline-SVG,
// die Farbe steckt im fill-Attribut statt in style.background - darum wird
// style.fill gelesen, das Preact aus dem JSX-Attribut ableitet.
const lightFirstBar = await page14.locator('.bars__fill').first().evaluate((el) => el.style.fill || el.getAttribute('fill'))
await page14.getByLabel('Settings').click()
await page14.waitForSelector('.settings')
await page14.getByRole('button', { name: 'Dark', exact: true }).click()
await page14.getByRole('button', { name: 'Back to the list' }).click()
await page14.getByRole('tab', { name: 'Dashboard' }).click()
await page14.waitForSelector('.dashboard')
const darkFirstBar = await page14.locator('.bars__fill').first().evaluate((el) => el.style.fill || el.getAttribute('fill'))
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

/*
 * Positivfall des Faelligkeiten-Widgets: eigener Build mit
 * test/fixtures/due-date.domain.js, die `dueDate` deklariert. src/domain.js
 * wird dafuer nur so lange ausgetauscht, wie der Build laeuft - genau wie in
 * test/multi-entity.mjs. Die Browser-Uhr wird auf einen festen Montag
 * gestellt, sonst haengt "diese Woche" vom Tag des Testlaufs ab.
 */
const dueOutDir = resolve(root, 'dist-due-date' + pidSuffix)
const dueDist = resolve(dueOutDir, 'index.html')
const dueDomainFixture = resolve(root, 'test/fixtures/due-date.domain.js')
buildWithDomain(dueDomainFixture, 'dist-due-date' + pidSuffix)
console.log('36a) Faelligkeiten-Build erzeugt:', dueDist)

// Eigener Browser-Context statt der gemeinsamen `ctx`: clock.install() friert
// die Uhr fuer den ganzen Context ein, nicht nur die eine Seite - in der
// gemeinsamen `ctx` liefe sonst jeder spaetere Test mit stehender Zeit weiter
// (z.B. die Idle-Aktualisierung der FileBar).
const dueCtx = await browser.newContext({ viewport: { width: 1280, height: 850 } })
const pageDue = await dueCtx.newPage()
pageDue.on('pageerror', (e) => errors.push(String(e)))
pageDue.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await pageDue.clock.install({ time: new Date(2026, 7, 17, 9) })
await openList(pageDue, dueDist)
await pageDue.getByRole('tab', { name: 'Dashboard' }).click()
await pageDue.waitForSelector('.dashboard')

// Nur nicht-leere Gruppen: die Fixture hat absichtlich keinen Datensatz in
// "Naechste 30 Tage", die Gruppe darf also gar nicht erst auftauchen.
const dueGroupLabels = await pageDue.locator('.due-widget__group-label').allInnerTexts()
console.log('36b) Faelligkeiten-Gruppen:', dueGroupLabels)
if (dueGroupLabels.length !== 2) fail('Erwartet 2 sichtbare Gruppen - die leere Gruppe haette verborgen bleiben muessen')
if (!dueGroupLabels.some((l) => l.startsWith('Overdue'))) fail('Ueberfaellig-Gruppe fehlt')
if (!dueGroupLabels.some((l) => l.startsWith('This week'))) fail('Diese-Woche-Gruppe fehlt')
if (dueGroupLabels.some((l) => l.startsWith('Next 30 days'))) fail('Leere Gruppe "Next 30 days" haette verborgen bleiben muessen')

const dueItems = await pageDue.locator('.due-widget__item').allInnerTexts()
console.log('    Eintraege:', dueItems)
if (dueItems.length !== 2) fail('Erwartet 2 sichtbare Eintraege (erledigt/ohne Datum/zu weit weg ausgeschlossen)')
if (dueItems.some((t) => /Far future|Done overdue|No due date/.test(t))) {
  fail('Ausgeschlossener Datensatz erscheint trotzdem im Faelligkeiten-Widget')
}

// Klick auf einen Eintrag oeffnet den zugehoerigen Datensatz - dieselbe
// Navigation wie beim Reference-Chip, nur vom Dashboard aus.
await pageDue.locator('.due-widget__item', { hasText: 'This week task' }).click()
await pageDue.waitForSelector('.drawer')
console.log('36c) Klick auf Faelligkeits-Eintrag oeffnet:', await pageDue.locator('.drawer__head h2').innerText())
const dueOpenedTitle = await pageDue.locator('#f-title').inputValue()
if (dueOpenedTitle !== 'This week task') fail('Klick auf Faelligkeits-Eintrag oeffnet den falschen Datensatz')

await dueCtx.close()
rmSync(dueOutDir, { recursive: true, force: true })

/*
 * Kennzahl-Kacheln (metrics): eigener Build mit test/fixtures/metrics.domain.js,
 * deren Seed so gewaehlt ist, dass jede Kachel mit Handzaehlung stimmt:
 * 6 Datensaetze, davon 5 offen; Summe 26.5; Mittelwert 26.5/6 = 4.416.. -> 4.42;
 * offen: Summe 20.5, Mittelwert 20.5/5 = 4.1 -> "4.10" (zwei Nachkommastellen).
 */
const metricsOutDir = resolve(root, 'dist-metrics' + pidSuffix)
const metricsDist = resolve(metricsOutDir, 'index.html')
const metricsFixture = resolve(root, 'test/fixtures/metrics.domain.js')
buildWithDomain(metricsFixture, 'dist-metrics' + pidSuffix)
console.log('36e) Kennzahlen-Build erzeugt:', metricsDist)

const metricsCtx = await browser.newContext({ viewport: { width: 1280, height: 850 } })
const pageMetrics = await metricsCtx.newPage()
pageMetrics.on('pageerror', (e) => errors.push(String(e)))
pageMetrics.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(pageMetrics, metricsDist)
await pageMetrics.getByRole('tab', { name: 'Dashboard' }).click()
await pageMetrics.waitForSelector('.dashboard')

// Alle drei Kachelformen stimmen mit dem Handzaehler ueberein.
const metricValues = await pageMetrics.locator('.tile--metric .tile__value').allInnerTexts()
console.log('36f) Kennzahl-Kacheln:', metricValues.join(' | '))
if (metricValues.length !== 5) fail('Erwartet 5 Kennzahl-Kacheln aus der metrics-Deklaration')
const [countAll, countOpen, sumAll, avgAll, avgOpen] = metricValues
if (countAll !== '6') fail(`Anzahl-Kachel zaehlt ${countAll} statt 6`)
if (countOpen !== '5') fail(`Gefilterte Anzahl-Kachel zaehlt ${countOpen} statt 5 - die erledigte Aufgabe gehoert nicht in den offenen Bestand`)
if (sumAll !== '26.5') fail(`Summen-Kachel rechnet ${sumAll} statt 26.5`)
if (avgAll !== '4.42') fail(`Mittelwert-Kachel rechnet ${avgAll} statt 4.42 (26.5/6, zwei Nachkommastellen)`)
if (avgOpen !== '4.10') fail(`Offene-Mittelwert-Kachel rechnet ${avgOpen} statt 4.10 (20.5/5)`)

// textContent statt innerText - das Label wird per CSS in Grossbuchstaben
// gesetzt, und genau diese Darstellung soll der Test nicht mitprüfen.
const firstMetricLabel = await pageMetrics.locator('.tile--metric').first().locator('.tile__label').textContent()
const firstMetricCaption = await pageMetrics.locator('.tile--metric').first().locator('.tile__caption').textContent()
if (firstMetricLabel !== 'Tasks in file') fail('Label der Deklaration wird nicht uebernommen')
if (firstMetricCaption !== 'all statuses') fail('Caption der Deklaration wird nicht angezeigt')

// Live-Aktualisierung: Basiswert aendern, ohne neu zu laden - die Kacheln
// rechnen beim Rendern und muessen der Aenderung sofort folgen.
await pageMetrics.getByRole('tab', { name: 'List' }).click()
await pageMetrics.locator('tr:has-text("Twelve days task")').locator('.cell-id').click()
await pageMetrics.waitForSelector('.drawer')
await pageMetrics.locator('#f-effort').fill('40')
await pageMetrics.getByRole('button', { name: 'Apply' }).click()
await pageMetrics.waitForSelector('.drawer', { state: 'detached' })
await pageMetrics.getByRole('tab', { name: 'Dashboard' }).click()
const metricValuesAfter = await pageMetrics.locator('.tile--metric .tile__value').allInnerTexts()
console.log('36g) Nach Basiswertänderung (12 → 40):', metricValuesAfter.join(' | '))
if (metricValuesAfter[2] !== '54.5') fail(`Summen-Kachel folgt nicht: ${metricValuesAfter[2]} statt 54.5`)
if (metricValuesAfter[4] !== '9.70') fail(`Offene-Mittelwert-Kachel folgt nicht: ${metricValuesAfter[4]} statt 9.70 (48.5/5)`)
if (metricValuesAfter[0] !== '6') fail('Anzahl-Kachel haette von der Wertänderung unberuehrt bleiben muessen')

// Klick auf eine Kachel springt zur Liste (V1 ungefiltert), auch per Tastatur.
await pageMetrics.locator('.tile--metric').first().click()
await pageMetrics.waitForSelector('table tbody tr')
console.log('36h) Klick auf Kachel — Ansicht:', await pageMetrics.locator('[role="tab"][aria-selected="true"]').allInnerTexts())
if ((await pageMetrics.locator('.dashboard').count()) !== 0) fail('Klick auf die Kachel verlaesst das Dashboard nicht')

await pageMetrics.getByRole('tab', { name: 'Dashboard' }).click()
await pageMetrics.locator('.tile--metric').first().focus()
await pageMetrics.keyboard.press('Enter')
await pageMetrics.waitForSelector('table tbody tr')
console.log('36i) Enter auf fokussierter Kachel landet ebenfalls in der Liste')

// Dezimalzeichen folgt der Oberflächensprache: Deutsch formatiert mit Komma.
await pageMetrics.getByLabel('Settings').click()
await pageMetrics.getByRole('button', { name: 'Deutsch' }).click()
await pageMetrics.getByRole('button', { name: 'Zurück zur Liste' }).click()
await pageMetrics.waitForSelector('table tbody tr')
await pageMetrics.getByRole('tab', { name: 'Dashboard' }).click()
const metricValuesDe = await pageMetrics.locator('.tile--metric .tile__value').allInnerTexts()
console.log('36l) Deutsche Oberfläche:', metricValuesDe.join(' | '))
// Nach der Basiswertänderung gilt weiter 54.5 als Summe, avg = 9.08 bzw. 9.70 -
// hier zählt nur das Komma als Dezimalzeichen.
if (metricValuesDe[2] !== '54,5') fail(`Deutsche Summe falsch: ${metricValuesDe[2]} statt 54,5`)
if (metricValuesDe[3] !== '9,08') fail(`Deutsches Dezimalzeichen fehlt: ${metricValuesDe[3]} statt 9,08`)
if (metricValuesDe[4] !== '9,70') fail(`Deutsches Dezimalzeichen fehlt: ${metricValuesDe[4]} statt 9,70`)

await metricsCtx.close()
rmSync(metricsOutDir, { recursive: true, force: true })

/*
 * Inline-SVG-Diagramme (OPEN-103): eigener Build mit
 * test/fixtures/charts.domain.js, dessen Seed so gewaehlt ist, dass jede
 * Kachel mit Handzaehlung stimmt. Prueft vier Dinge gemeinsam:
 *  - das SVG enthaelt weder script- noch Event-Attribute noch externe URLs
 *    (sanitizeSvg-Vertrag), damit ein Renderer-Bug nicht still eine Quelle
 *    einbringen kann;
 *  - die Balken- und Donut-Skalierung passt zum Handzettel;
 *  - die Linie aggregiert nach Monat (count, sum) und zeichnet Beschriftung
 *    an jeder Achse;
 *  - eine fehlerhafte Deklaration landet als Beanstandungs-Kachel im Raster,
 *    nicht stillschweigend im Nichts.
 */
const chartsOutDir = resolve(root, 'dist-charts' + pidSuffix)
const chartsDist = resolve(chartsOutDir, 'index.html')
const chartsFixture = resolve(root, 'test/fixtures/charts.domain.js')
buildWithDomain(chartsFixture, 'dist-charts' + pidSuffix)
console.log('36j) Diagramme-Build erzeugt:', chartsDist)

const chartsCtx = await browser.newContext({ viewport: { width: 1280, height: 850 } })
const pageCharts = await chartsCtx.newPage()
const chartsErrors = []
pageCharts.on('pageerror', (e) => chartsErrors.push(String(e)))
pageCharts.on('console', (m) => m.type() === 'error' && chartsErrors.push(m.text()))
await openList(pageCharts, chartsDist)
await pageCharts.getByRole('tab', { name: 'Dashboard' }).click()
await pageCharts.waitForSelector('.dashboard')

// Drei Charts sind Bar, Bar, Donut, Line, Line - die Schreibweise 'type:
// chart' ist die neue einheitliche Form; 'type: bar' und 'type: donut'
// (Legacy in Beispielen) werden weiterhin erkannt. Hier ist alles auf
// 'chart' gestellt, also sollte die Render-Welle ausschliesslich aus SVG
// mit den drei Achsen-Bausteinen bestehen.
const svgCount = await pageCharts.locator('svg.bars, svg.line-chart, .donut > svg').count()
console.log('36k) SVG-Diagramme auf der Seite:', svgCount)
if (svgCount < 5) fail(`Erwartet mindestens 5 Diagramme (4x Bar + 3x Donut + 2x Line), gefunden ${svgCount}`)

// Sicherheitspruefung: kein Script-Element im Diagramm-SVG, keine on*-Handler,
// keine externen URLs. Wer den Renderer eines Tages erweitert und dabei ein
// Attribut einbringt, das der sanitizeSvg-Reiniger spaeter kassieren wuerde,
// faengt diesen Bug hier. Das gesamte SVG-Markup wird einmal eingesammelt
// und gegen die bekannten schlechten Muster verglichen.
const svgMarkup = await pageCharts.locator('svg.bars, svg.line-chart, .donut > svg').evaluateAll((nodes) =>
  nodes.map((n) => n.outerHTML).join(''),
)
console.log('36l) SVG-Gesamtmenge:', svgMarkup.length, 'Bytes')
if (/<script/i.test(svgMarkup)) fail('Diagramm-SVG enthaelt ein script-Element')
if (/\son[a-z]+\s*=/i.test(svgMarkup)) fail('Diagramm-SVG enthaelt on*-Attribute')
if (/href\s*=\s*["']https?:/i.test(svgMarkup)) fail('Diagramm-SVG verweist extern')
if (/src\s*=\s*["']https?:/i.test(svgMarkup)) fail('Diagramm-SVG laedt externe Quelle')

// Bar-Charts: zwei Stueck, beide gegen das Handzaehler-Bild - IT 11 / PR 13
// (effort) und IT 3 / PR 3 (count). Wir pruefen die gerenderten Wert-Texte
// und das Verhaeltnis der <rect class="bars__fill">-Breiten. textContent statt
// innerText, weil innerText in manchen Playwright-Versionen fuer SVG-Inhalte
// undefined liefert.
const barValuesEffort = await pageCharts.locator('text.bars__value').evaluateAll((nodes) => nodes.map((n) => n.textContent))
console.log('36m) Bar-Werte (alle Balken, in Reihenfolge):', barValuesEffort.join(' | '))
if (!barValuesEffort.includes('11') || !barValuesEffort.includes('13')) {
  fail('Balken-Summe (effort) zeigt nicht 11 (IT) und 13 (PR)')
}
if (!barValuesEffort.includes('3')) fail('Balken-Anzahl zeigt nicht 3 je Bereich')

// Verhaeltnispruefung: Das rect-Element fuer IT (Wert 11) muss breiter sein
// als das fuer PR (Wert 13) im Effort-Chart, aber kuerzer im Count-Chart
// (3 vs. 3 -> gleich breit). Hier reicht der Blick auf die fill-Box.
const barFills = await pageCharts.locator('rect.bars__fill').evaluateAll((nodes) =>
  nodes.map((n) => ({ w: Number(n.getAttribute('width')), fill: n.getAttribute('fill') })),
)
const widest = Math.max(...barFills.map((r) => r.w))
const narrowest = Math.min(...barFills.map((r) => r.w))
console.log('36n) Bar-Fuellbreiten: max', widest.toFixed(1), 'min', narrowest.toFixed(1))
if (widest <= narrowest) fail('Groesster Balken ist nicht breiter als der kleinste')
// Der Count-Chart hat fuer beide Bereiche den Wert 3, beide Balken also
// gleich breit - schmaler als der breiteste aus dem Effort-Chart.
if (widest === narrowest) fail('Mindestens ein Balken sollte groesser sein als ein anderer')

// Achsen-Tick: das Effort-Chart skaliert auf 13 -> 20 (niceScale 1,2,2.5,5,10
// -> Schritt 20), also sollten die Ticks 0, 10, 20 als Beschriftung auftauchen.
const axisTexts = await pageCharts.locator('svg.bars .bars__axis text').evaluateAll((nodes) => nodes.map((n) => n.textContent))
console.log('36o) Achsen-Beschriftung Balken:', axisTexts.join(' '))
if (!axisTexts.includes('20')) fail('Achse nennt die Obergrenze 20 nicht')

// Donut: pro Donut-Kachel muss die Summe der Legenden-Eintraege gleich dem
// Ring-Total sein. Beide Donuts (Legacy + neue chart-Schreibweise) tragen
// jeweils 6 (IT 3 + PR 3); wir pruefen jeden einzeln.
const donutTiles = await pageCharts.locator('.donut').count()
console.log('36p) Donut-Kacheln:', donutTiles)
if (donutTiles < 2) fail('Erwartet mindestens 2 Donuts (Legacy + neue Form), gefunden ' + donutTiles)
for (let i = 0; i < donutTiles; i++) {
  const tile = pageCharts.locator('.donut').nth(i)
  const total = Number(await tile.locator('.donut__total').textContent())
  const legendSum = (await tile.locator('.legend__value').evaluateAll((nodes) => nodes.map((n) => Number(n.textContent))))
    .reduce((n, t) => n + t, 0)
  console.log(`    Donut ${i}: Total=${total} | Legende=${legendSum}`)
  if (total !== legendSum) fail(`Donut ${i}: Ring und Legende widersprechen sich (${total} vs ${legendSum})`)
  if (total !== 6) fail(`Donut ${i}: erwartet 6, war ${total}`)
}

// Linie (count): drei Punkte 1, 2, 3. Wir lesen die Punkte via <circle class=
// "line-chart__dot"> und ihre Y-Position im viewBox. Das Skalenraster ist
// glatt (1, 2, 3 = 20%, 40%, 60% der Skala), und genau das macht den Test:
// der Chart muss die Werte monoton nach oben zeichnen. title-Attribut liefert
// den exakten Wert, weil die Y-Position allein bei unterschiedlichen Skalen
// gleich aussehen kann.
const lineDotsCount = await pageCharts.locator('svg.line-chart').first().locator('circle.line-chart__dot').evaluateAll((nodes) =>
  nodes.map((n) => ({ cy: Number(n.getAttribute('cy')), title: n.querySelector('title')?.textContent })),
)
console.log('36q) Linie count:', lineDotsCount.map((d) => `${d.title}@y=${d.cy}`).join(', '))
if (lineDotsCount.length !== 3) fail(`Linie count zeichnet ${lineDotsCount.length} statt 3 Punkte`)
if (!(lineDotsCount[0].cy > lineDotsCount[1].cy && lineDotsCount[1].cy > lineDotsCount[2].cy)) {
  fail('Linie count: Punkte sind nicht monoton fallend (Werte 1, 2, 3)')
}
if (!lineDotsCount.some((d) => d.title === '2026-01: 1') ||
    !lineDotsCount.some((d) => d.title === '2026-02: 2') ||
    !lineDotsCount.some((d) => d.title === '2026-03: 3')) {
  fail('Linie count: Punkte tragen nicht die erwarteten Werte 1, 2, 3')
}

// Linie (sum effort): Maximalwert ist 12 (Maerz 4+8), Linie faengt im Januar
// bei 4. Werte sind hier 4, 8, 12 - der Unterschied zum count-Chart steckt
// in den title-Texten.
const lineDotsSum = await pageCharts.locator('svg.line-chart').nth(1).locator('circle.line-chart__dot').evaluateAll((nodes) =>
  nodes.map((n) => ({ cy: Number(n.getAttribute('cy')), title: n.querySelector('title')?.textContent })),
)
console.log('36r) Linie sum:', lineDotsSum.map((d) => `${d.title}@y=${d.cy}`).join(', '))
if (!lineDotsSum.some((d) => d.title === '2026-01: 4') ||
    !lineDotsSum.some((d) => d.title === '2026-02: 8') ||
    !lineDotsSum.some((d) => d.title === '2026-03: 12')) {
  fail('Linie sum: Punkte tragen nicht die erwarteten Werte 4, 8, 12')
}

// Pfad-String: die Linie hat tatsaechlich Linien-Befehle, nicht nur Punkte.
const linePathD = await pageCharts.locator('svg.line-chart path.line-chart__line').first().getAttribute('d')
if (!/^M[\d.]+ [\d.]+( L[\d.]+ [\d.]+)+$/.test(linePathD)) {
  fail('Linie hat keinen M/L-Pfadstring: ' + linePathD)
}
if ((linePathD.match(/L/g) || []).length < 2) fail('Linie verbindet weniger als 3 Punkte')

// X-Achse: Beschriftung jedes Monats (MM/YY) erscheint als <text>.
const xTicks = await pageCharts.locator('svg.line-chart').first().locator('text.line-chart__tick').evaluateAll((nodes) => nodes.map((n) => n.textContent))
console.log('36s) X-Achsen-Beschriftung Linie:', xTicks.join(' '))
if (!xTicks.some((t) => /01\/26/.test(t))) fail('Januar-Beschriftung fehlt auf der X-Achse')
if (!xTicks.some((t) => /03\/26/.test(t))) fail('Maerz-Beschriftung fehlt auf der X-Achse')

// Verworfene Diagramm-Deklaration: der Eintrag { type: 'chart', kind: 'line',
// dateField: 'ghost' } muss als Beanstandungs-Kachel sichtbar sein, nicht
// still ignoriert. Die Kachel nennt den Grund ("Names no existing field") im
// Klartext - dieselbe Haltung wie bei den Metriken (validateMetrics).
const issueTileTexts = await pageCharts.locator('.tile--metric-issue').allInnerTexts()
console.log('36t) Beanstandungs-Kacheln:', issueTileTexts.length)
if (issueTileTexts.length === 0) fail('Verworfene Diagramm-Deklaration wurde still ignoriert')
if (!issueTileTexts.some((t) => /ghost/i.test(t))) {
  fail('Beanstandungs-Kachel nennt das unbekannte Feld nicht: ' + JSON.stringify(issueTileTexts))
}

await chartsCtx.close()
rmSync(chartsOutDir, { recursive: true, force: true })

/*
 * Verworfene Deklarationen werden benannt statt still ignoriert: eigener Build
 * mit test/fixtures/metrics-invalid.domain.js - unbekannter Katalogeintrag,
 * Summe ueber ein Textfeld, avg ohne Feld. Die gueltige Deklaration muss daneben
 * weiterlaufen, und das Werkzeug selbst bleibt bedienbar.
 */
const invalidOutDir = resolve(root, 'dist-metrics-invalid' + pidSuffix)
const invalidDist = resolve(invalidOutDir, 'index.html')
buildWithDomain(resolve(root, 'test/fixtures/metrics-invalid.domain.js'), 'dist-metrics-invalid' + pidSuffix)
console.log('36j) Build mit ungueltigen Deklarationen erzeugt:', invalidDist)

const invalidCtx = await browser.newContext({ viewport: { width: 1280, height: 850 } })
const pageInvalid = await invalidCtx.newPage()
pageInvalid.on('pageerror', (e) => errors.push(String(e)))
pageInvalid.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(pageInvalid, invalidDist)
await pageInvalid.getByRole('tab', { name: 'Dashboard' }).click()
await pageInvalid.waitForSelector('.dashboard')

const rejectedReasons = await pageInvalid.locator('.tile--metric-issue li').allInnerTexts()
console.log('36k) Verworfene Deklarationen:', JSON.stringify(rejectedReasons))
if (rejectedReasons.length !== 3) fail('Erwartet 3 benannte Verwerfungen')
if (!rejectedReasons.some((t) => t.includes('"total"'))) fail('Der unbekannte Katalogeintrag "total" wurde nicht benannt')
if (!rejectedReasons.some((t) => t.includes('Title') && t.toLowerCase().includes('numeric'))) {
  fail('Die Summe ueber das Textfeld "Title" wurde nicht als nicht-numerisch beanstandet')
}
if (!rejectedReasons.some((t) => t.includes('nonexistent'))) fail('Das fehlende Feld wurde nicht benannt')

const validCountTiles = await pageInvalid.locator('.tile--metric .tile__value').allInnerTexts()
console.log('    Gueltige Kachel daneben:', validCountTiles.join(' | '))
if (validCountTiles.length !== 1 || validCountTiles[0] !== '2') {
  fail('Die gueltige Deklaration muss neben den verworfenen weiterlaufen')
}

await pageInvalid.getByRole('tab', { name: 'List' }).click()
await pageInvalid.waitForSelector('table tbody tr')
console.log('    Werkzeug weiterhin bedienbar — Zeilen:', await pageInvalid.locator('table tbody tr').count())

await invalidCtx.close()
rmSync(invalidOutDir, { recursive: true, force: true })

// Beispiel-Prompts, Version und Aenderungsprotokoll.
const page15 = await ctx.newPage()
page15.on('pageerror', (e) => errors.push(String(e)))
page15.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(page15, dist)

const hintCount = await page15.locator('.hint').count()
const hintPrompt = await page15.locator('.hint__prompt q').first().innerText()
console.log('37) Hinweiskaesten sichtbar:', hintCount)
console.log('    Erster Beispiel-Prompt:', hintPrompt.slice(0, 60) + '…')
if (hintCount < 3) fail('Beispiel-Prompts fehlen in der Listenansicht')

// Speichern fragt nach Notiz und Version, beides landet in der Datei
await page15.locator('.filebar__save').click()
await page15.waitForSelector('#log-note')
await page15.locator('#log-note').fill('Erste Fassung nach dem Kickoff')
await page15.locator('#log-version').fill('1.0')
await page15.screenshot({ path: resolve(tmp, 'speichern-dialog.png') })
const [logDownload] = await Promise.all([
  page15.waitForEvent('download', { timeout: 15000 }),
  page15.locator('.modal__foot .btn--primary').click(),
])
const versioned = resolve(tmp, 'mit-version.html')
await logDownload.saveAs(versioned)
console.log('38) Dateiname mit Version:', logDownload.suggestedFilename())
if (!logDownload.suggestedFilename().includes('-1.0-')) fail('Version fehlt im Dateinamen')

const badge = await page15.locator('.head .version').innerText()
console.log('    Version neben dem Titel:', badge)
if (badge !== '1.0') fail('Version wird nicht neben dem Titel angezeigt')

const logPayload = readFileSync(versioned, 'utf8').match(
  /<script id="sb-payload"[^>]*>([\s\S]*?)<\/script>/,
)[1]
const logParsed = JSON.parse(logPayload.replace(/\\u003c/g, '<'))
console.log('39) Protokolleintrag in der Datei:', JSON.stringify(logParsed.data.log?.[0]))
if (logParsed.data.log?.length !== 1) fail('Kein Protokolleintrag geschrieben')
if (logParsed.data.log[0].note !== 'Erste Fassung nach dem Kickoff') fail('Notiz kam nicht an')
if (logParsed.settings.version !== '1.0') fail('Version wurde nicht in den Einstellungen abgelegt')

await page15.getByRole('tab', { name: 'Change log' }).click()
await page15.waitForSelector('.logview__list')
console.log('40) Protokollansicht:', await page15.locator('.logview__list li').count(), 'Eintrag')
if ((await page15.locator('.logview__note').inputValue()) !== 'Erste Fassung nach dem Kickoff') {
  fail('Protokollansicht zeigt die Notiz nicht')
}
await page15.screenshot({ path: resolve(tmp, 'protokoll.png') })

// Beispiel-Prompts abschaltbar
await page15.getByLabel('Settings').click()
await page15.waitForSelector('.settings')
await page15.getByText('shown', { exact: true }).click()
await page15.getByRole('button', { name: 'Back to the list' }).click()
await page15.waitForSelector('table tbody tr')
console.log('41) Hinweiskaesten nach dem Abschalten:', await page15.locator('.hint').count())
if ((await page15.locator('.hint').count()) !== 0) fail('Beispiel-Prompts liessen sich nicht abschalten')

// Copyright-Hinweis: gehoert dem, der das Werkzeug baut. Vorbelegt mit
// openToolbox, frei ueberschreibbar, Link optional - darunter steht immer
// unveraendert die Herkunftszeile.
await page15.getByLabel('Settings').click()
await page15.waitForSelector('.settings')
const footDefault = await page15.locator('.settings__foot').innerText()
console.log('42) Fusszeile ab Werk:', footDefault.replace(/\n/g, ' | '))
if (!footDefault.includes('© openToolbox')) fail('Voreingestellter Copyright-Hinweis fehlt')
if (!footDefault.includes('based on openToolbox')) fail('Herkunftszeile fehlt')

const crField = page15.locator('.setting', { hasText: 'Copyright notice' }).locator('input')
await crField.fill('© 2026 Muster Consulting GmbH')
await page15.waitForTimeout(150)
const footCustom = await page15.locator('.settings__foot').innerText()
console.log('    Nach eigener Angabe:', footCustom.split('\n')[0])
if (!footCustom.includes('Muster Consulting')) fail('Eigener Copyright-Hinweis wird nicht angezeigt')
if (!footCustom.includes('based on openToolbox')) fail('Herkunftszeile darf nicht verschwinden')

const crUrl = page15.locator('.setting', { hasText: 'Copyright link' }).locator('input')
await crUrl.fill('')
await page15.waitForTimeout(150)
console.log('43) Ohne Link Verweise im Hinweis:', await page15.locator('.settings__copyright a').count())
if ((await page15.locator('.settings__copyright a').count()) !== 0) {
  fail('Leerer Link erzeugt trotzdem einen Verweis')
}
// Fehlbedienungsschutz: Einstellungen sperren, sichtbar lassen, mit dem Wort
// wieder oeffnen. Kein Sicherheitsversprechen - nur eine Huerde.
const lockRow = page15.locator('.setting', { hasText: 'Protect settings' })
await lockRow.getByRole('button').first().click()
await page15.waitForSelector('#lock-word')
await page15.locator('#lock-word').fill('123')
await page15.locator('.modal__foot .btn--primary').click()
await page15.waitForSelector('.settings__locked')

const titleField = page15.locator('.suffixed input')  // Dateiname-Feld, eindeutig
console.log('44) Nach dem Schuetzen — Titelfeld gesperrt:', await titleField.isDisabled())
if (!(await titleField.isDisabled())) fail('Gesperrte Einstellungen bleiben bedienbar')
if (!(await titleField.isVisible())) fail('Gesperrte Felder duerfen nicht verschwinden')
await page15.screenshot({ path: resolve(tmp, 'einstellungen-gesperrt.png'), fullPage: true })

// Falsches Wort laesst die Sperre stehen
await page15.locator('.settings__locked .btn').click()
await page15.waitForSelector('#lock-word')
await page15.locator('#lock-word').fill('falsch')
await page15.locator('.modal__foot .btn--primary').click()
await page15.waitForSelector('.modal .error')
console.log('45) Falsches Wort:', await page15.locator('.modal .error').innerText())
if (!(await titleField.isDisabled())) fail('Falsches Wort hat die Einstellungen geoeffnet')

// Richtiges Wort oeffnet sie
await page15.locator('#lock-word').fill('123')
await page15.locator('.modal__foot .btn--primary').click()
await page15.waitForSelector('.settings__locked', { state: 'detached' })
console.log('46) Nach dem Entsperren — Titelfeld gesperrt:', await titleField.isDisabled())
if (await titleField.isDisabled()) fail('Richtiges Wort hat die Einstellungen nicht geoeffnet')

// Entsperrt gilt nur fuer die Sitzung: die gespeicherte Datei ist wieder zu,
// und das Wort steht nicht im Klartext darin.
const lockedFile = resolve(tmp, 'gesperrt.html')
await page15.getByRole('button', { name: 'Back to the list' }).click()
await page15.waitForSelector('table tbody tr')
await saveTo(page15, lockedFile, 'Einstellungen geschuetzt')
const lockedSource = readFileSync(lockedFile, 'utf8')
const lockedPayload = JSON.parse(
  lockedSource.match(/<script id="sb-payload"[^>]*>([\s\S]*?)<\/script>/)[1].replace(/\\u003c/g, '<'),
)
console.log('47) Sperreintrag in der Datei:', JSON.stringify(lockedPayload.settings.lock))
if (!lockedPayload.settings.lock?.hash) fail('Sperre wurde nicht mitgespeichert')
if (/"lock":\s*\{[^}]*"123"/.test(lockedSource)) fail('Wort steht im Klartext in der Datei')

const page16 = await ctx.newPage()
page16.on('pageerror', (e) => errors.push(String(e)))
await openList(page16, lockedFile)
await page16.getByLabel('Settings').click()
await page16.waitForSelector('.settings__locked')
const reopened = page16.locator('.suffixed input')
console.log('48) Nach erneutem Oeffnen gesperrt:', await reopened.isDisabled())
if (!(await reopened.isDisabled())) fail('Erneut geoeffnete Datei ist nicht mehr geschuetzt')
await page16.close()

// Kopfzeilentext und die Verweise rechts in der Dateizeile.
const page17 = await ctx.newPage()
page17.on('pageerror', (e) => errors.push(String(e)))
page17.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(page17, dist)

const barDefault = await page17.locator('.filebar__name').innerText()
const linkDefault = await page17.locator('.filebar__links a').getAttribute('href')
const linkTarget = await page17.locator('.filebar__links a').getAttribute('target')
const linkRel = await page17.locator('.filebar__links a').getAttribute('rel')
console.log('49) Dateizeile ab Werk:', barDefault, '| Verweis:', linkDefault, linkTarget, linkRel)
if (!barDefault.includes('application and data in a single file')) fail('Standard-Kopfzeile fehlt')
if (linkDefault !== 'https://github.com/m-dohmen/openToolbox') fail('Voreingestellter Verweis fehlt')
if (linkTarget !== '_blank' || !linkRel.includes('noopener')) fail('Verweis oeffnet nicht sicher im neuen Tab')

// Der Verweis sitzt links neben dem Zustandsblock, nicht irgendwo dazwischen.
const geo = await page17.evaluate(() => {
  const l = document.querySelector('.filebar__links').getBoundingClientRect()
  const s = document.querySelector('.filebar__state').getBoundingClientRect()
  const m = document.querySelector('.filebar__meta').getBoundingClientRect()
  return { linksRight: l.right, stateLeft: s.left, metaRight: m.right }
})
console.log('    Position:', JSON.stringify(geo))
if (geo.linksRight > geo.stateLeft + 1) fail('Verweise ueberlappen den Zustandsblock')
if (geo.linksRight - geo.metaRight < 100) fail('Verweise kleben an den Metadaten statt rechts zu sitzen')

// Eigener Kopfzeilentext gewinnt gegen den uebersetzten Standard
await page17.getByLabel('Settings').click()
await page17.waitForSelector('.settings')
await page17.locator('.setting', { hasText: 'Header line' }).locator('input').fill('Muster Consulting · internal')
await page17.waitForTimeout(150)

// Zweiter Verweis, und eine Adresse, die nicht in ein href gehoert
await page17.getByRole('button', { name: 'Add link' }).click()
const urlFields = page17.locator('.links__url')
await urlFields.nth(1).fill('javascript:alert(1)')
await page17.waitForTimeout(150)
console.log('50) Nach javascript:-Adresse angezeigte Verweise:', await page17.locator('.filebar__links a').count())
if ((await page17.locator('.filebar__links a').count()) !== 1) fail('javascript:-Adresse landete in der Kopfzeile')

// Adresse ohne Schema wird als https ergaenzt und angezeigt
await urlFields.nth(1).fill('intranet.example.com/qm')
await page17.locator('.links__label').nth(1).fill('QM handbook')
await page17.waitForTimeout(150)
const hrefs = await page17.locator('.filebar__links a').evaluateAll((els) => els.map((e) => e.href))
console.log('51) Verweise jetzt:', hrefs.join(' '))
if (hrefs[1] !== 'https://intranet.example.com/qm') fail('Adresse ohne Schema wurde nicht ergaenzt')

await page17.getByRole('button', { name: 'Back to the list' }).click()
await page17.waitForSelector('table tbody tr')
const barCustom = await page17.locator('.filebar__name').innerText()
console.log('52) Eigene Kopfzeile:', barCustom)
if (!barCustom.includes('Muster Consulting · internal')) fail('Eigener Kopfzeilentext wird nicht angezeigt')

// Beides reist mit der Datei
const linkFile = resolve(tmp, 'mit-verweisen.html')
await saveTo(page17, linkFile, 'Kopfzeile und Verweise gesetzt')
const page18 = await ctx.newPage()
page18.on('pageerror', (e) => errors.push(String(e)))
await openList(page18, linkFile)
const reopenedBar = await page18.locator('.filebar__name').innerText()
const reopenedLinks = await page18.locator('.filebar__links a').evaluateAll((els) =>
  els.map((e) => e.getAttribute('title')),
)
console.log('53) Nach erneutem Oeffnen:', reopenedBar, '|', reopenedLinks.join(' / '))
if (!reopenedBar.includes('Muster Consulting')) fail('Kopfzeilentext reist nicht mit der Datei')
if (reopenedLinks[1] !== 'QM handbook') fail('Verweise reisen nicht mit der Datei')
await page18.close()

// Prüfregeln: eine Stelle im Schema, drei Wege (Formular, CSV, KI-Vorschlag).
const page19 = await ctx.newPage()
page19.on('pageerror', (e) => errors.push(String(e)))
page19.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(page19, dist)

const before = await page19.locator('table tbody tr').count()
await page19.getByRole('button', { name: /^New / }).click()
await page19.waitForSelector('.drawer')
await page19.locator('#f-title').fill('Rule check')
await page19.locator('#f-status').selectOption('in progress')
await page19.locator('.drawer__foot .btn--primary').click()
await page19.waitForSelector('.field__objection')
console.log('54) Regel im Formular:', await page19.locator('.field__objection').first().innerText())
if ((await page19.locator('table tbody tr').count()) !== before) fail('Regelverstoss wurde trotzdem gespeichert')
if (!(await page19.locator('.drawer__objections').isVisible())) fail('Sammelmeldung fehlt')

// Verstoss beheben, dann laesst sich speichern
await page19.locator('#f-owner').fill('A. Reinke')
await page19.locator('.drawer__foot .btn--primary').click()
await page19.waitForSelector('.drawer', { state: 'detached' })
console.log('55) Nach dem Beheben gespeichert — Zeilen:', await page19.locator('table tbody tr').count())
if ((await page19.locator('table tbody tr').count()) !== before + 1) fail('Nach dem Beheben liess sich nicht speichern')

// Ein frisches Formular ist nicht sofort rot
await page19.getByRole('button', { name: /^New / }).click()
await page19.waitForSelector('.drawer')
console.log('56) Frisches Formular — Beanstandungen sichtbar:', await page19.locator('.field__objection').count())
if ((await page19.locator('.field__objection').count()) !== 0) fail('Leeres Formular zeigt sofort Beanstandungen')
await page19.keyboard.press('Escape')

// Dieselbe Regel beim CSV-Import
const ruleCsv = resolve(tmp, 'regeln.csv')
writeFileSync(
  ruleCsv,
  'Title;Owner;Status;Effort in days\n' +
    'With an owner;M. Voss;in progress;3\n' +
    'Without an owner;;in progress;3\n',
)
await page19.evaluate(() => {
  const original = HTMLInputElement.prototype.click
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { window.__csvPicker = this; return }
    return original.call(this)
  }
})
await page19.getByText('Import CSV', { exact: true }).click()
await page19.waitForFunction(() => window.__csvPicker)
const ruleHandle = await page19.evaluateHandle(() => window.__csvPicker)
await ruleHandle.asElement().setInputFiles(ruleCsv)
await page19.waitForSelector('.import__map')
await page19.getByRole('button', { name: 'Import', exact: true }).click()
await page19.waitForSelector('.import__problems li')
const ruleProblem = await page19.locator('.import__problems li').first().innerText()
const ruleOutcome = await page19.locator('.modal--wide .note').first().innerText()
console.log('57) Regel beim Import:', ruleProblem, '|', ruleOutcome)
if (!ruleProblem.includes('needs an owner')) fail('Regel greift beim CSV-Import nicht')
if (!ruleOutcome.startsWith('1 record')) fail('Genau eine Zeile haette durchkommen muessen')
await page19.getByRole('button', { name: 'Close' }).click()
await page19.close()

// Gefuehrte Erfassung: mehrere Schritte, bedingter Schritt, CSV in denselben
// Durchlauf, geschrieben wird erst am Ende.
const page20 = await ctx.newPage()
page20.on('pageerror', (e) => errors.push(String(e)))
page20.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(page20, dist)
const rowsBeforeWizard = await page20.locator('table tbody tr').count()

await page20.getByRole('tab', { name: 'Guided entry' }).click()
await page20.waitForSelector('.wizard')
console.log('58) Schritte vor der Eingabe:', (await page20.locator('.wizard__rail li').allInnerTexts()).join(' / '))
if ((await page20.locator('.wizard__rail li').count()) !== 3) fail('Bedingter Schritt haette verborgen sein muessen')

// Ohne Titel geht es nicht weiter - dieselbe Pruefung wie im Formular
await page20.getByRole('button', { name: 'Next' }).click()
await page20.waitForSelector('.field__objection')
console.log('59) Regel im Wizard:', await page20.locator('.field__objection').first().innerText())
if (!/1 of 3/i.test(await page20.locator('.wizard__badge').innerText())) fail('Wizard ist trotz Beanstandung weitergegangen')

// Titel fuellen: der bedingte CSV-Schritt taucht auf
await page20.locator('#f-title').fill('Close the findings from the June audit')
await page20.waitForTimeout(150)
console.log('60) Schritte nach dem Titel:', (await page20.locator('.wizard__rail li').allInnerTexts()).join(' / '))
if ((await page20.locator('.wizard__rail li').count()) !== 4) fail('Bedingter Schritt ist nicht erschienen')

await page20.getByRole('button', { name: 'Next' }).click()
await page20.waitForSelector('#f-owner')
await page20.locator('#f-owner').fill('S. Behrens')
await page20.locator('#f-status').selectOption('in progress')
await page20.getByRole('button', { name: 'Next' }).click()

// CSV-Schritt: die Zeilen werden vorgemerkt, nicht geschrieben. Eine Zeile,
// die der regelmaessige Import abweisen wuerde (Status "in progress" ohne
// Owner), darf hier nicht still mit durchkommen - dieselbe Pruefung.
await page20.waitForSelector('.wizard__csv')
const wizCsv = resolve(tmp, 'wizard.csv')
writeFileSync(
  wizCsv,
  'Title;Owner;Status\n' +
    'From the file A;M. Voss;open\n' +
    'From the file B;M. Voss;open\n' +
    'Rule breaker;;in progress\n',
)
await page20.locator('.wizard__csv input[type=file]').setInputFiles(wizCsv)
await page20.waitForSelector('.wizard__csv .import__map')
await page20.getByRole('button', { name: 'Take these rows' }).click()
await page20.waitForSelector('.note--ok')
console.log('61) CSV im Wizard:', await page20.locator('.note--ok').innerText())
const wizProblems = await page20.locator('.wizard__csv .import__problems li').allInnerTexts()
console.log('    Beanstandungen:', wizProblems.join(' / '))
if (!wizProblems.some((p) => p.includes('needs an owner'))) {
  fail('Der Wizard-CSV-Schritt hat eine Regelverstoss-Zeile nicht beanstandet')
}
if (!wizProblems.some((p) => p.includes('Line 4'))) fail('Die Beanstandung nennt die Zeile nicht')
if ((await page20.locator('.note--ok').innerText()).includes('3')) {
  fail('Die beanstandete Zeile wurde trotzdem vorgemerkt')
}

await page20.getByRole('button', { name: 'Next' }).click()
await page20.waitForSelector('.wizard__review')
const reviewText = await page20.locator('.wizard__review').innerText()
console.log('62) Vorschau:', reviewText.split('\n').slice(0, 2).join(' | '))
if (!reviewText.includes('3 ×')) fail('Vorschau zaehlt Entwurf und CSV-Zeilen nicht zusammen')
await page20.screenshot({ path: resolve(tmp, 'wizard-review.png') })

await page20.locator('#wizard-note').fill('Reported through the guided entry')
await page20.locator('.wizard__foot .btn--primary').click()
await page20.waitForSelector('.wizard__inner--done')
console.log('63) Abschluss:', await page20.locator('.wizard__inner--done h2').innerText())

await page20.locator('.wizard__foot .btn--quiet').click()
await page20.waitForSelector('table tbody tr')
const rowsAfterWizard = await page20.locator('table tbody tr').count()
console.log('64) Zeilen', rowsBeforeWizard, '->', rowsAfterWizard)
if (rowsAfterWizard !== rowsBeforeWizard + 3) fail('Wizard hat nicht alle drei Datensaetze angelegt')

// Abbruch hinterlaesst nichts
await page20.getByRole('tab', { name: 'Guided entry' }).click()
await page20.waitForSelector('.wizard')
await page20.locator('#f-title').fill('Abandoned halfway')
await page20.locator('.wizard__foot .btn--quiet').last().click()
await page20.waitForSelector('table tbody tr')
console.log('65) Nach dem Abbruch — Zeilen:', await page20.locator('table tbody tr').count())
if ((await page20.locator('table tbody tr').count()) !== rowsAfterWizard) fail('Abgebrochener Durchlauf hat etwas hinterlassen')

// Erfassungsmodus: die Datei oeffnet direkt im Wizard, ohne Liste
await page20.getByLabel('Settings').click()
await page20.waitForSelector('.settings')
await page20.getByRole('button', { name: 'Guided entry', exact: true }).click()
await page20.waitForTimeout(150)
const intakeFile = resolve(tmp, 'erfassung.html')
await page20.getByRole('button', { name: 'Back to the list' }).click()
await saveTo(page20, intakeFile, 'Als Erfassungsbogen')
await page20.close()

const page21 = await ctx.newPage()
page21.on('pageerror', (e) => errors.push(String(e)))
await page21.goto('file://' + intakeFile)
/* Auch im Erfassungsmodus kommt zuerst die Startseite: wer eine Datei
   zugeschickt bekommt, um etwas zu melden, will zuerst wissen, warum. Von dort
   fuehrt der Knopf in den Wizard und nicht in die Liste. */
await page21.waitForSelector('.home')
await page21.locator('.home__foot .btn--primary').click()
await page21.waitForSelector('.wizard')
console.log('66) Erfassungsmodus — Tabelle vorhanden:', (await page21.locator('table').count()) > 0,
  '| Reiter:', await page21.locator('.entity-tabs').count(),
  '| Neu-Knopf:', await page21.getByRole('button', { name: /^New / }).count())
if ((await page21.locator('table').count()) !== 0) fail('Erfassungsmodus zeigt trotzdem die Liste')
if ((await page21.getByRole('button', { name: /^New / }).count()) !== 0) fail('Erfassungsmodus zeigt den Neu-Knopf')
await page21.screenshot({ path: resolve(tmp, 'erfassungsmodus.png') })
await page21.close()

/* Abgleich zweier Kopien - der Fall, fuer den es diese Bauform sonst nicht
   gibt: Datei rausgeschickt, veraendert zurueckbekommen. */
const page22 = await ctx.newPage()
page22.on('pageerror', (e) => errors.push(String(e)))
page22.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(page22, dist)

// Die "zurueckgeschickte" Kopie: ein Datensatz geaendert, einer neu.
await page22.locator('table tbody tr').first().locator('.cell-id').click()
await page22.waitForSelector('.drawer')
const editedId = await page22.locator('.drawer .cell-id').innerText()
await page22.locator('#f-owner').fill('Returned by the department')
await page22.locator('.drawer__foot .btn--primary').click()
await page22.waitForSelector('.drawer', { state: 'detached' })
await page22.getByRole('button', { name: /^New / }).click()
await page22.waitForSelector('.drawer')
await page22.locator('#f-title').fill('Added by the department')
await page22.locator('.drawer__foot .btn--primary').click()
await page22.waitForSelector('.drawer', { state: 'detached' })
const theirCopy = resolve(tmp, 'rueecklauf.html')
await saveTo(page22, theirCopy, 'Rueecklauf aus der Fachabteilung')
await page22.close()

// Der eigene Stand: unveraendert, plus ein Datensatz, den es dort nicht gibt.
const page23 = await ctx.newPage()
page23.on('pageerror', (e) => errors.push(String(e)))
page23.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(page23, dist)
await page23.getByRole('button', { name: /^New / }).click()
await page23.waitForSelector('.drawer')
await page23.locator('#f-title').fill('Only in my copy')
await page23.locator('.drawer__foot .btn--primary').click()
await page23.waitForSelector('.drawer', { state: 'detached' })
const mineBefore = await page23.locator('table tbody tr').count()

await page23.evaluate(() => {
  const original = HTMLInputElement.prototype.click
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { window.__mergePicker = this; return }
    return original.call(this)
  }
})
await page23.getByText('Merge a file', { exact: true }).click()
await page23.waitForFunction(() => window.__mergePicker)
const mergeHandle = await page23.evaluateHandle(() => window.__mergePicker)
await mergeHandle.asElement().setInputFiles(theirCopy)
await page23.waitForSelector('.merge')

console.log('67) Abgleich:', await page23.locator('.merge .note').first().innerText())
const groups = await page23.locator('.merge__head span').allInnerTexts()
console.log('    Gruppen:', groups.join(' | '))
if (!groups.some((g) => g.includes('not in this file'))) fail('Neue Datensaetze nicht erkannt')
if (!groups.some((g) => g.includes('different values'))) fail('Geaenderte Datensaetze nicht erkannt')
if (!groups.some((g) => g.includes('missing in the other file'))) fail('Fehlende Datensaetze nicht erkannt')

const diffLine = await page23.locator('.merge__diff li').first().innerText()
console.log('68) Feldunterschied:', diffLine.replace(/\n/g, ' '))
if (!diffLine.includes('Returned by the department')) fail('Feldvergleich zeigt den neuen Wert nicht')

// Geloeschtes ist bewusst nicht vorausgewaehlt
const removedChecked = await page23
  .locator('.merge__group--removed input:checked')
  .count()
console.log('69) Vorausgewaehlt in "fehlt hier nicht":', removedChecked)
if (removedChecked !== 0) fail('Loeschungen duerfen nicht vorausgewaehlt sein')

await page23.locator('.modal__foot .btn--primary').click()
await page23.waitForSelector('.merge', { state: 'detached' })
const mineAfter = await page23.locator('table tbody tr').count()
console.log('70) Zeilen', mineBefore, '->', mineAfter)
if (mineAfter !== mineBefore + 1) fail('Der neue Datensatz aus der anderen Datei fehlt')
if ((await page23.locator('tr:has-text("Only in my copy")').count()) !== 1) {
  fail('Der eigene Datensatz wurde beim Abgleich geloescht')
}
const mergedOwner = await page23.locator(`tr:has-text("${editedId}")`).innerText()
console.log('71) Uebernommener Wert vorhanden:', mergedOwner.includes('Returned by the department'))
if (!mergedOwner.includes('Returned by the department')) fail('Geaenderter Wert wurde nicht uebernommen')

// Derselbe Abgleich noch einmal: jetzt darf es keinen Unterschied mehr geben
await page23.getByText('Merge a file', { exact: true }).click()
await page23.waitForFunction(() => window.__mergePicker)
await (await page23.evaluateHandle(() => window.__mergePicker)).asElement().setInputFiles(theirCopy)
await page23.waitForSelector('.merge')
const secondRun = await page23.locator('.merge .note').first().innerText()
console.log('72) Zweiter Durchlauf:', secondRun)
if (!/0 new, 0 changed/.test(secondRun)) fail('Nach dem Abgleich bestehen noch Unterschiede')
await page23.locator('.modal__foot .btn--quiet').click()
await page23.close()

/* Feldaenderungen: abgeleitet statt eingetippt. Ein Protokoll, das von der
   Disziplin des Schreibenden abhaengt, ist genau dann lueckenhaft, wenn es
   gebraucht wird. */
const page24 = await ctx.newPage()
page24.on('pageerror', (e) => errors.push(String(e)))
page24.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(page24, dist)

// Ein Feld aendern, einen Datensatz anlegen, einen loeschen
await page24.locator('table tbody tr').first().locator('.cell-id').click()
await page24.waitForSelector('.drawer')
const trailId = await page24.locator('.drawer .cell-id').innerText()
await page24.locator('#f-owner').fill('P. Neumann')
await page24.locator('.drawer__foot .btn--primary').click()
await page24.waitForSelector('.drawer', { state: 'detached' })

await page24.getByRole('button', { name: /^New / }).click()
await page24.waitForSelector('.drawer')
await page24.locator('#f-title').fill('Created for the trail')
await page24.locator('.drawer__foot .btn--primary').click()
await page24.waitForSelector('.drawer', { state: 'detached' })

await page24.locator('table tbody tr').last().locator('.cell-id').click()
await page24.waitForSelector('.drawer')
await page24.locator('.btn--danger').click()
await page24.locator('.btn--danger').click()
await page24.waitForSelector('.drawer', { state: 'detached' })

const trailFile = resolve(tmp, 'mit-spur.html')
await saveTo(page24, trailFile, 'Owner umgehaengt, einer neu, einer raus')

await page24.getByRole('tab', { name: 'Change log' }).click()
await page24.waitForSelector('.logview__list')
await page24.locator('.trail summary').first().click()
/* Das <details> oeffnet nativ und sofort, aber Chromium braucht danach einen
   Layout-Durchlauf, bevor innerText() die Flex-Kinder (Feld/Vorher/Nachher)
   sauber getrennt zurueckgibt - sonst liest man gelegentlich mitten in der
   Anzeige und bekommt Titel und Wert ohne Trennung zusammengeklebt.
   waitFor('visible') wartet auf ein stabiles Layout, bevor gelesen wird. */
await page24.locator('.trail__list li').first().waitFor({ state: 'visible' })
const trailItems = await page24.locator('.trail__list li').allInnerTexts()
console.log('73) Feldaenderungen im Protokoll:', trailItems.length)
trailItems.slice(0, 3).forEach((line) => console.log('   ', line.replace(/\n/g, ' ')))
if (trailItems.length < 3) fail('Nicht alle drei Aenderungsarten protokolliert')
const joined = trailItems.join(' ')
// Feldname und Wert einzeln pruefen statt nur den Wert - sonst faellt ein
// fehlendes Feld/Vorher (das Zusammenkleben, das diese Pruefung eigentlich
// faengt) nicht auf, weil der neue Wert allein auch ohne Trennung vorkommt.
if (!joined.includes('Owner')) fail('Feldname fehlt im Protokoll')
if (!joined.includes('P. Neumann')) fail('Feldaenderung fehlt')
if (!joined.includes('created')) fail('Anlegen fehlt')
if (!joined.includes('deleted')) fail('Loeschen fehlt')

// In der Datei, nicht nur auf dem Bildschirm
const trailPayload = JSON.parse(
  readFileSync(trailFile, 'utf8')
    .match(/<script id="sb-payload"[^>]*>([\s\S]*?)<\/script>/)[1]
    .replace(/\\u003c/g, '<'),
)
/* Ueber alle Eintraege statt nur den letzten, und gegen die vorher gemerkte Id
   statt gegen eine Tabellenposition - die Pruefung soll aussagen, dass genau
   dieser Datensatz seine Aenderung mitbekommen hat. */
const written = trailPayload.data.log.flatMap((e) => e.changes ?? [])
const forRecord = written.filter((c) => c.id === trailId)
console.log('74) In der Datei abgelegt:', written.length, 'Aenderungen |', JSON.stringify(forRecord[0]))
if (!forRecord.some((c) => c.op === 'updated' && c.field === 'Owner' && c.after === 'P. Neumann')) {
  fail(`Feldaenderung an ${trailId} steht nicht in der Datei: ${JSON.stringify(written)}`)
}
if (!written.some((c) => c.op === 'created')) fail('Anlegen fehlt in der Datei')
if (!written.some((c) => c.op === 'deleted')) fail('Loeschen fehlt in der Datei')

// Historie eines einzelnen Datensatzes im Formular
await page24.getByRole('tab', { name: 'List' }).click()
await page24.waitForSelector('table tbody tr')
await page24.locator(`tr:has-text("${trailId}") .cell-id`).click()
await page24.waitForSelector('.drawer')
await page24.locator('.trail--record summary').click()
await page24.locator('.trail--record .trail__list li').first().waitFor({ state: 'visible' })
const recordTrail = await page24.locator('.trail--record .trail__list li').allInnerTexts()
console.log('75) Historie des Datensatzes:', recordTrail.map((l) => l.replace(/\n/g, ' ')).join(' | '))
if (!recordTrail.join(' ').includes('P. Neumann')) fail('Datensatz-Historie zeigt die Aenderung nicht')
await page24.keyboard.press('Escape')

// Zweites Speichern ohne Aenderung schreibt keine Feldliste
await saveTo(page24, resolve(tmp, 'ohne-aenderung.html'), 'Nichts geaendert')
await page24.getByRole('tab', { name: 'Change log' }).click()
await page24.waitForSelector('.logview__list')
const summaries = await page24.locator('.logview__list > li').first().locator('.trail').count()
console.log('76) Speichern ohne Aenderung — Feldliste vorhanden:', summaries)
if (summaries !== 0) fail('Ohne Aenderung darf keine Feldliste entstehen')
await page24.close()

/* Anhaenge. Das Budget gehoert zum Feature: ohne harte Grenze macht der dritte
   Scan aus dem Werkzeug einen Mailanhang, den kein Gateway mehr durchlaesst. */
const page25 = await ctx.newPage()
page25.on('pageerror', (e) => errors.push(String(e)))
page25.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(page25, dist)

const budgetBefore = await page25.locator('.filebar__budget').innerText()
console.log('77) Budgetanzeige ab Werk:', budgetBefore)
if (!budgetBefore.includes('0.0 of 5 MB')) fail('Budgetanzeige fehlt oder startet nicht bei null')

const evidence = resolve(tmp, 'nachweis.txt')
writeFileSync(evidence, 'X'.repeat(300 * 1024))
await page25.locator('table tbody tr').first().locator('.cell-id').click()
await page25.waitForSelector('.drawer')
await page25.locator('.attach input[type=file]').setInputFiles(evidence)
await page25.waitForSelector('.attach__file')
console.log('78) Angehaengt:', await page25.locator('.attach__file').innerText())
await page25.locator('.drawer__foot .btn--primary').click()
await page25.waitForSelector('.drawer', { state: 'detached' })

const budgetAfter = await page25.locator('.filebar__budget').innerText()
console.log('79) Budget danach:', budgetAfter, '| in der Tabelle:',
  await page25.locator('.cell-attach').first().innerText())
if (budgetAfter.includes('0.0 of')) fail('Budgetanzeige zaehlt den Anhang nicht mit')
if ((await page25.locator('.cell-attach:has-text("nachweis.txt")').count()) !== 1) {
  fail('Der Dateiname steht nicht in der Tabelle')
}

// Ueber der Grenze wird abgelehnt statt geduldet
await page25.getByLabel('Settings').click()
await page25.waitForSelector('.settings')
await page25.locator('.setting', { hasText: 'Attachment limit' }).locator('input').fill('1')
await page25.getByRole('button', { name: 'Back to the list' }).click()
await page25.waitForSelector('table tbody tr')
const big = resolve(tmp, 'zu-gross.bin')
writeFileSync(big, Buffer.alloc(1200 * 1024, 65))
await page25.locator('table tbody tr').nth(1).locator('.cell-id').click()
await page25.waitForSelector('.drawer')
await page25.locator('.attach input[type=file]').setInputFiles(big)
await page25.waitForSelector('.attach__file')
await page25.locator('.drawer__foot .btn--primary').click()
await page25.waitForSelector('.toast--error')
console.log('80) Ueber der Grenze:', await page25.locator('.toast--error').innerText())
if ((await page25.locator('.drawer').count()) !== 1) fail('Das Formular haette offen bleiben muessen')
await page25.keyboard.press('Escape')

// CSV traegt den Dateinamen, nicht das base64
const [csvDownload] = await Promise.all([
  page25.waitForEvent('download', { timeout: 15000 }),
  page25.getByText('CSV for Excel', { exact: true }).click(),
])
const csvOut = resolve(tmp, 'mit-anhang.csv')
await csvDownload.saveAs(csvOut)
const csvText = readFileSync(csvOut, 'utf8')
console.log('81) CSV enthaelt den Dateinamen:', csvText.includes('nachweis.txt'),
  '| base64 darin:', /[A-Za-z0-9+/]{200,}/.test(csvText))
if (!csvText.includes('nachweis.txt')) fail('Dateiname fehlt im CSV')
if (/[A-Za-z0-9+/]{200,}/.test(csvText)) fail('Der Anhangsinhalt landet im CSV')

// Und in der Datei liegt er wirklich drin
const attachFile = resolve(tmp, 'mit-anhang.html')
await saveTo(page25, attachFile, 'Mit Nachweis')
const attachSource = readFileSync(attachFile, 'utf8')
console.log('82) Datei mit Anhang:', (attachSource.length / 1024).toFixed(0), 'KB')
if (!attachSource.includes('nachweis.txt')) fail('Der Anhang wurde nicht mitgespeichert')

const page26 = await ctx.newPage()
page26.on('pageerror', (e) => errors.push(String(e)))
await openList(page26, attachFile)
await page26.locator('.cell-attach:has-text("nachweis.txt")').click()
await page26.waitForSelector('.drawer')
const [attachDownload] = await Promise.all([
  page26.waitForEvent('download', { timeout: 15000 }),
  page26.locator('.attach__file').click(),
])
const back = resolve(tmp, 'zurueck.txt')
await attachDownload.saveAs(back)
console.log('83) Wieder heruntergeladen:', attachDownload.suggestedFilename(),
  '| Bytes identisch:', readFileSync(back).length === readFileSync(evidence).length)
if (readFileSync(back).length !== readFileSync(evidence).length) fail('Der Anhang kam nicht unveraendert zurueck')
await page26.close()
await page25.close()

/* Startseite: erklaert das Werkzeug, bevor jemand auf Daten schaut. Bearbeitbar
   auf der Seite selbst - aber nur, solange die Einstellungen offen sind. */
const page27 = await ctx.newPage()
page27.on('pageerror', (e) => errors.push(String(e)))
page27.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page27.goto('file://' + dist)
await page27.waitForSelector('.home')
console.log('84) Startansicht:', await page27.locator('.prose h2').first().innerText(),
  '| Reiter:', (await page27.locator('.entity-tabs__views button').allInnerTexts()).join('/'))
if ((await page27.locator('table').count()) !== 0) fail('Die Liste haette nicht der Einstieg sein duerfen')

await page27.locator('.home__foot .btn--primary').click()
await page27.waitForSelector('table tbody tr')
console.log('85) Nach dem Startknopf — Zeilen:', await page27.locator('table tbody tr').count())

// Bearbeiten, mit Markup in der Eingabe
await page27.getByRole('tab', { name: 'Start' }).click()
await page27.waitForSelector('.home')
await page27.getByRole('button', { name: 'Edit this page' }).click()
await page27.waitForSelector('.home__editor')
await page27.locator('.home__editor').fill(
  '# Audit findings 2026\n\nMaintained by **M. Dohmen**. <script>alert(1)</script>\n\n- One finding per record',
)
await page27.waitForTimeout(200)
const previewHtml = await page27.locator('.home__preview').innerHTML()
console.log('86) Vorschau — script-Element vorhanden:', previewHtml.includes('<script'),
  '| als Text sichtbar:', (await page27.locator('.home__preview').innerText()).includes('<script>'))
if (previewHtml.includes('<script')) fail('Markup aus dem Text wurde zu echtem Markup')
if (!(await page27.locator('.home__preview strong').count())) fail('Fettschrift wird nicht gerendert')

await page27.locator('.home__foot .btn--primary').click()
await page27.waitForSelector('.home__editor', { state: 'detached' })
console.log('87) Nach dem Uebernehmen:', await page27.locator('.prose h2').innerText())
if ((await page27.locator('.prose h2').innerText()) !== 'Audit findings 2026') fail('Der Text wurde nicht uebernommen')

// Schutz der Einstellungen deckt die Startseite mit ab
await page27.getByLabel('Settings').click()
await page27.waitForSelector('.settings')
await page27.locator('.setting', { hasText: 'Protect settings' }).getByRole('button').first().click()
await page27.waitForSelector('#lock-word')
await page27.locator('#lock-word').fill('123')
await page27.locator('.modal__foot .btn--primary').click()
await page27.waitForSelector('.settings__locked')
await page27.getByRole('button', { name: 'Back to the list' }).click()
await page27.getByRole('tab', { name: 'Start' }).click()
await page27.waitForSelector('.home')
console.log('88) Geschuetzt — Bearbeiten-Knopf:', await page27.getByRole('button', { name: 'Edit this page' }).count(),
  '| Hinweis:', await page27.locator('.home__locked').innerText())
if ((await page27.getByRole('button', { name: 'Edit this page' }).count()) !== 0) {
  fail('Die Startseite laesst sich trotz Schutz bearbeiten')
}

// Text reist mit der Datei
const homeFile = resolve(tmp, 'mit-startseite.html')
await saveTo(page27, homeFile, 'Startseite geschrieben')
await page27.close()

const page28 = await ctx.newPage()
page28.on('pageerror', (e) => errors.push(String(e)))
await page28.goto('file://' + homeFile)
await page28.waitForSelector('.home')
console.log('89) Nach erneutem Oeffnen:', await page28.locator('.prose h2').innerText())
if ((await page28.locator('.prose h2').innerText()) !== 'Audit findings 2026') fail('Der Text reist nicht mit der Datei')
await page28.screenshot({ path: resolve(tmp, 'startseite.png') })
await page28.close()

// Idle-Update der relativen Alters-Angabe: eine offen bleibende, unberuehrte
// Datei muss sich ohne Klick oder Neuladen aktualisieren.
const page29 = await ctx.newPage()
page29.on('pageerror', (e) => errors.push(String(e)))
await page29.clock.install({ time: new Date() })
await page29.goto('file://' + homeFile)
await page29.waitForSelector('.filebar__meta')
const ageBeforeIdle = await page29.locator('.filebar__meta').innerText()
await page29.clock.fastForward('05:00')
const ageAfterIdle = await page29.locator('.filebar__meta').innerText()
console.log('90) Alters-Angabe vor/nach 5 Minuten Leerlauf:', JSON.stringify(ageBeforeIdle), '/', JSON.stringify(ageAfterIdle))
if (ageBeforeIdle === ageAfterIdle) fail('Relative Alters-Angabe aktualisiert sich nicht von selbst in einer offenen Datei')
await page29.close()

/* Globale Suche und Feldfilter in der Oberfläche: das Suchfeld steht im
   Kopfbereich und trifft alle Felder aller Entitäten - auch Zahlen und
   Daten, die nie in schema.search standen. Feldfilter je Feldtyp laufen über
   die Seitenleiste, aktive Filter erscheinen als entfernbare Chips. Der
   Zustand lebt nur in der Sitzung: nach dem Neuladen ist alles zurück. */
const page30 = await ctx.newPage()
page30.on('pageerror', (e) => errors.push(String(e)))
await openList(page30, dist)

const searchBox = page30.locator('.globalsearch input[type="search"]')
if ((await searchBox.count()) !== 1) fail('Das globale Suchfeld fehlt im Kopfbereich')

// Treffer über mehrere Felder hinweg: "krueger" steht beim Eigentümer, nicht im Titel.
await searchBox.fill('krueger')
await page30.waitForTimeout(150)
const kruegerRows = await page30.locator('table tbody tr').count()
const kruegerMarks = await page30.locator('td mark').count()
console.log('91) Suche "krueger":', kruegerRows, 'Zeilen | Hervorhebungen:', kruegerMarks,
  '| Zähler:', await page30.locator('.toolbar .counter').innerText())
if (kruegerRows !== 2) fail('Die Volltextsuche über Nicht-Titel-Felder traf nicht die erwarteten Zeilen')
if (kruegerMarks < 1) fail('Der Suchtreffer wurde in der Tabelle nicht hervorgehoben')
if (!/2 of 11/.test(await page30.locator('.toolbar .counter').innerText())) fail('Der Zähler zeigt nicht die Trefferzahl')

// Exakter Zelltreffer: entspricht der Suchbegriff der ganzen Zelle, steht die
// Zelle komplett in <mark> - derselbe Weg wie beim Treffer mitten im Text.
await searchBox.fill('T. Krueger')
await page30.waitForTimeout(150)
const exactRows = await page30.locator('table tbody tr').count()
const exactMarks = await page30.locator('td mark').count()
console.log('92) Suche "T. Krueger" (ganze Zelle):', exactRows, 'Zeilen | Hervorhebungen:', exactMarks)
if (exactRows !== 2) fail('Die Suche auf den vollen Zelltext trifft nicht die erwarteten Zeilen')
if (exactMarks !== 2) fail('Ein exakter Zelltreffer wird nicht hervorgehoben')

// Zahlen und Daten sind ebenfalls Volltext - beides stand nie in schema.search.
await searchBox.fill('16')
await page30.waitForTimeout(150)
const sixteenTitle = await page30.locator('tr:has-text("Recalibrate") .cell-title').innerText()
console.log('93) Suche "16" trifft den Aufwand:', sixteenTitle.split('\n')[0])
if (!sixteenTitle.includes('Recalibrate')) fail('Die Suche findet keine Zahlenwerte')
const plus21 = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10)
await searchBox.fill(plus21)
await page30.waitForTimeout(150)
if ((await page30.locator('table tbody tr').count()) !== 1) fail('Die Suche findet keine Datumswerte')
await searchBox.fill('')
await page30.waitForTimeout(150)
if ((await page30.locator('table tbody tr').count()) !== 11) fail('Nach dem Leeren der Suche fehlen Zeilen')

// Text-Filter (enthält) als Chip - und wieder entfernen.
await page30.locator('.fieldfilter input[aria-label="Owner contains…"]').fill('behrens')
await page30.waitForTimeout(150)
const behrensRows = await page30.locator('table tbody tr').count()
console.log('94) Enthält-Filter "behrens":', behrensRows, 'Zeilen | Chips:', await page30.locator('.chips--filters .chip').count())
if (behrensRows !== 2) fail('Der enthält-Filter schneidet nicht wie erwartet')
if ((await page30.locator('.chips--filters .chip').count()) !== 1) fail('Der aktive Filter erscheint nicht als Chip')
await page30.locator('.chips--filters .chip button').click()
await page30.waitForTimeout(150)
if ((await page30.locator('table tbody tr').count()) !== 11) fail('Entfernen des Chips hebt den Filter nicht auf')

// Zahl (von/bis) und Datum (von/bis), dann beide zusammen.
await page30.locator('.fieldfilter input[aria-label="Effort in days from"]').fill('10')
await page30.locator('.fieldfilter input[aria-label="Effort in days to"]').fill('15')
await page30.waitForTimeout(150)
const effortRows = await page30.locator('table tbody tr').count()
console.log('95) Aufwand 10 bis 15:', effortRows, 'Zeilen')
if (effortRows !== 2) fail('Der Zahlenbereich filtert nicht korrekt')
const pastBoundary = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
await page30.locator('.fieldfilter input[aria-label="Due date from"]').fill(pastBoundary)
await page30.waitForTimeout(150)
const comboRangeRows = await page30.locator('table tbody tr').count()
console.log('    zuzüglich Fälligkeit ab', pastBoundary, ':', comboRangeRows, 'Zeilen | Chips:',
  await page30.locator('.chips--filters .chip').count())
if (comboRangeRows !== 1) fail('Zahl- und Datumsbereich kombinieren sich nicht')
if ((await page30.locator('.chips--filters .chip').count()) !== 2) fail('Zwei aktive Filter erscheinen nicht als zwei Chips')
if (!(await page30.locator('.chips__clear').count())) fail('Bei mehreren Filtern fehlt der Alles-löschen-Knopf')
await page30.locator('.chips__clear').click()
await page30.waitForTimeout(150)
if ((await page30.locator('table tbody tr').count()) !== 11) fail('Alle Filter löschen räumt nicht auf')

// Kombination aus globaler Suche und Feldfilter: erst schneidet die Suche,
// im Rest entscheidet der Bereich.
await searchBox.fill('krueger')
await page30.locator('.fieldfilter input[aria-label="Effort in days from"]').fill('10')
await page30.waitForTimeout(150)
const comboRows = await page30.locator('table tbody tr').count()
const comboTitle = comboRows ? await page30.locator('table tbody tr').first().locator('.cell-title').innerText() : ''
console.log('96) Suche "krueger" + Aufwand ab 10:', comboRows, '|', comboTitle.split('\n')[0])
if (comboRows !== 1 || !comboTitle.includes('Sign off')) fail('Suche und Filter schneiden nicht gemeinsam korrekt')

// Sitzungsspeicher: nichts davon übersteht ein Neuladen.
await openList(page30, dist)
const reloadedRows = await page30.locator('table tbody tr').count()
const reloadedQuery = await searchBox.inputValue()
const reloadedChips = await page30.locator('.chips--filters .chip').count()
console.log('97) Nach Neuladen:', reloadedRows, 'Zeilen | Suchfeld:', JSON.stringify(reloadedQuery), '| Chips:', reloadedChips)
if (reloadedRows !== 11 || reloadedQuery !== '' || reloadedChips !== 0) {
  fail('Suche/Filter sollen nur in der Sitzung leben, nicht im Datenblock oder Speicher')
}
await page30.close()

// JSON-Import: derselbe Prueflauf wie beim CSV-Import - falscher Aufzaehlungswert,
// fehlendes Pflichtfeld, doppelte Id. Ein einziger Verstoss lehnt die GANZE
// Datei ab (atomarer Import), nichts landet ungeprueft im Bestand.
const page31 = await ctx.newPage()
page31.on('pageerror', (e) => errors.push(String(e)))
page31.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(page31, dist)
const jsonRowsBefore = await page31.locator('table tbody tr').count()

await page31.evaluate(() => {
  const original = HTMLInputElement.prototype.click
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { window.__jsonPicker = this; return }
    return original.call(this)
  }
})
await page31.getByText('Import JSON', { exact: true }).click()
await page31.waitForFunction(() => window.__jsonPicker)
// pickFile erzeugt je Aufruf ein neues Input-Element - der Handle wird vor
// jeder Dateiuebergabe frisch aufgeloest.
const pickJson = async (path) => {
  await page31.getByText('Import JSON', { exact: true }).click()
  await page31.waitForFunction(() => window.__jsonPicker)
  const handle = await page31.evaluateHandle(() => window.__jsonPicker)
  await handle.asElement().setInputFiles(path)
}

const badJson = resolve(tmp, 'import-kaputt.json')
writeFileSync(
  badJson,
  JSON.stringify({
    records: [
      { id: 'A-9001', title: 'Looks fine', status: 'open', effort: 2 },
      { id: 'A-9002', title: 'Broken status', status: 'erledigt' }, // falscher Enum-Wert
      { id: 'A-9002', title: 'Duplicate id', status: 'open' }, // doppelte Id
      { title: 'Missing id', status: 'open' }, // fehlender Bezeichner
    ],
  }),
)
await pickJson(badJson)
await page31.waitForSelector('.toast--error', { timeout: 5000 })
const jsonReject = await page31.locator('.toast--error').innerText()
console.log('98) JSON-Import abgelehnt:', jsonReject)
if (!jsonReject.includes('rejected')) fail('Der JSON-Import hat eine fehlerhafte Datei nicht abgelehnt')
if (!jsonReject.includes('A-9002')) fail('Die Ablehnung nennt den doppelten Bezeichner nicht')
if ((await page31.locator('table tbody tr').count()) !== jsonRowsBefore) {
  fail('Die abgelehnte Datei hat den Bestand veraendert')
}
const leaked = await page31.locator('tr:has-text("Looks fine")').count()
if (leaked) fail('Aus der abgelehnten Datei ist trotzdem ein Datensatz im Bestand gelandet')

// Saubere Datei: kommt durch. Zahlen als Text werden kanonisiert, die Regel
// ("in progress" braucht Owner) ist hier erfuellt. Erst warten, bis der
// Fehl-Toast des vorherigen Imports abgeklungen ist, sonst greift der
// Selektor auf den alten Toast.
const okJson = resolve(tmp, 'import-sauber.json')
writeFileSync(
  okJson,
  JSON.stringify({
    records: [{ id: 'A-9100', title: 'From clean JSON', owner: 'M. Voss', status: 'in progress', effort: '4' }],
  }),
)
await page31.waitForSelector('.toast', { state: 'detached', timeout: 6000 })
await pickJson(okJson)
await page31.waitForSelector('.toast:not(.toast--error)', { timeout: 5000 })
console.log('99) JSON-Import sauber:', await page31.locator('.toast').innerText())
// Ein flaches Array ERSETZT die Datensaetze der aktiven Entitaet - wie beim
// Round-Trip eines Exports, sonst wuerde das Zurueckspielen Ids verdoppeln.
if ((await page31.locator('table tbody tr').count()) !== 1) {
  fail('Die saubere JSON-Datei hat die aktive Entitaet nicht vollstaendig ersetzt')
}
const jsonRow = await page31.locator('tr:has-text("From clean JSON")').innerText()
if (!/\b4\b/.test(jsonRow)) fail('Der Aufwand wurde nicht in eine Zahl ueberfuehrt')
await page31.close()

/*
 * Zahlzelle mit gespeicherter 0 (OPEN-79): eigener Build mit
 * test/fixtures/number-zero.domain.js, deren Seed die beiden Grenzfaelle
 * nebeneinanderstellt - 0 als echte Antwort und ein tatsaechlich leeres Feld.
 * Die Zelle muss die 0 zeigen; nur null/undefined/'' duerfen den Platzhalter
 * bringen. Berechnete Felder sind hier bewusst nicht dabei - sie pruefen
 * bereits auf explizite Leerwerte.
 */
const zeroOutDir = resolve(root, 'dist-number-zero' + pidSuffix)
const zeroDist = resolve(zeroOutDir, 'index.html')
buildWithDomain(resolve(root, 'test/fixtures/number-zero.domain.js'), 'dist-number-zero' + pidSuffix)
console.log('100) Zahlzellen-Build erzeugt:', zeroDist)

const zeroCtx = await browser.newContext({ viewport: { width: 1280, height: 850 } })
const pageZero = await zeroCtx.newPage()
pageZero.on('pageerror', (e) => errors.push(String(e)))
pageZero.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(pageZero, zeroDist)

const zeroCell = await pageZero.locator('tr:has-text("Zero budget") td.cell-num').innerText()
console.log('101) Gespeicherte 0 in der Liste:', JSON.stringify(zeroCell))
if (zeroCell !== '0') fail('Die Zahlzelle zeigt eine gespeicherte 0 nicht als "0" an')

const emptyCell = await pageZero.locator('tr:has-text("No amount yet") td.cell-num').innerText()
console.log('102) Leere Zahlzelle:', JSON.stringify(emptyCell))
if (emptyCell !== '—') fail('Eine leere Zahlzelle soll weiter den Platzhalter zeigen')

// Und das Formular erzählt dieselbe Wahrheit: die 0 steht drin, statt als
// leer zu erscheinen.
await pageZero.locator('tr:has-text("Zero budget") .cell-id').click()
await pageZero.waitForSelector('.drawer')
const zeroInForm = await pageZero.locator('#f-amount').inputValue()
console.log('103) 0 im Formular:', JSON.stringify(zeroInForm))
if (zeroInForm !== '0') fail('Das Formular verliert die gespeicherte 0')
await pageZero.keyboard.press('Escape')

await zeroCtx.close()
rmSync(zeroOutDir, { recursive: true, force: true })

/*
 * Berichtskopie (OPEN-93 / OPEN-99): "Berichtskopie exportieren" erzeugt eine
 * eigenstaendige HTML-Datei, in der Save, Undo, Wizard, KI-Proposals, Settings,
 * Import und Merge verschwunden sind. Der Dateiname folgt <fileStem>-report-
 * <YYYYMMDD>.html, der Stempel zeigt Version + Exportdatum, und die Quelldatei
 * bekommt einen Protokolleintrag "Berichtskopie exportiert".
 */
const pageReport = await ctx.newPage()
pageReport.on('pageerror', (e) => errors.push(String(e)))
pageReport.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await openList(pageReport, dist)

const reportBtn = pageReport.getByRole('button', { name: 'Export a read-only copy' })
console.log('104) Berichtskopie-Button vorhanden:', await reportBtn.count())
if (!(await reportBtn.count())) fail('Berichtskopie-Export fehlt in der Sidebar')

const [reportDl] = await Promise.all([
  pageReport.waitForEvent('download', { timeout: 15000 }),
  reportBtn.click(),
])
const reportName = reportDl.suggestedFilename()
const reportPath = resolve(tmp, 'berichtskopie.html')
await reportDl.saveAs(reportPath)
console.log('105) Berichtskopie-Dateiname:', reportName)
if (!/-report-\d{4}-\d{2}-\d{2}\.html$/.test(reportName)) fail('Dateiname folgt nicht <stem>-report-<YYYYMMDD>.html')

// Quelldatei muss den Protokolleintrag bekommen haben - der Eintrag entsteht
// im Sitzungsspeicher, erst der naechste save() schreibt ihn in die Datei.
await saveTo(pageReport, resolve(tmp, 'quelle-mit-export.html'), 'Berichtskopie erzeugt')
const sourceText = readFileSync(resolve(tmp, 'quelle-mit-export.html'), 'utf8')
const sourceLog = JSON.parse(
  sourceText.match(/<script id="sb-payload"[^>]*>([\s\S]*?)<\/script>/)[1].replace(/\\u003c/g, '<'),
)
const exportedNote = (sourceLog.data?.log ?? []).find((e) => /Read-only report copy exported/.test(e.note ?? ''))
console.log('106) Eintrag in der Quelldatei:', exportedNote ? exportedNote.note : 'fehlt')
if (!exportedNote) fail('Quell-Protokoll enthaelt keinen "Berichtskopie exportiert"-Eintrag')

// Inhalt der Kopie: Schreibflags unten, Stempel oben, kein AI, kein Audit-Log.
const reportText = readFileSync(reportPath, 'utf8')
const reportPayload = JSON.parse(
  reportText.match(/<script id="sb-payload"[^>]*>([\s\S]*?)<\/script>/)[1],
)
console.log('107) Schreibflags in der Kopie:', JSON.stringify({
  readOnly: reportPayload.settings?.readOnly,
  auditLog: reportPayload.settings?.auditLog,
  aiEnabled: reportPayload.settings?.ai?.enabled,
  mode: reportPayload.settings?.mode,
}))
if (!reportPayload.settings?.readOnly) fail('readOnly wurde nicht gesetzt')
if (reportPayload.settings?.auditLog !== false) fail('auditLog wurde nicht abgeschaltet')
if (reportPayload.settings?.ai?.enabled !== false) fail('AI wurde nicht abgeschaltet')
if (reportPayload.settings?.mode !== 'workbench') fail('mode wurde nicht auf workbench gesetzt')
if (!reportPayload.report?.at) fail('report.at fehlt im Datenblock')
if (reportPayload.report?.version === undefined) fail('report.version fehlt im Datenblock')

// Oeffnen der Kopie: Stempel sichtbar, Save/Undo/Settings/Wizard/Import/Merge weg.
const reportCtx = await browser.newContext({ viewport: { width: 1280, height: 850 } })
const reportPage = await reportCtx.newPage()
reportPage.on('pageerror', (e) => errors.push(String(e)))
reportPage.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await reportPage.goto('file://' + reportPath)
await reportPage.waitForSelector('.report-banner', { timeout: 5000 })
const banner = await reportPage.locator('.report-banner').innerText()
console.log('108) Stempel sichtbar:', banner.replace(/\s+/g, ' '))
if (!/Read-only report copy/.test(banner)) fail('Stempel-Text fehlt')

const surfacesToVerify = {
  save: '.filebar__save',
  undo: '.filebar__history-btn',
  settingsIcon: 'button[aria-label="Settings"]',
  newRecord: 'button:has-text("New")',
  chatDock: 'ai-dock, [data-ai]',
  importJson: 'button:has-text("Import JSON")',
  importCsv: 'button:has-text("Import CSV")',
  merge: 'button:has-text("Merge a file")',
  wizardTab: 'button:has-text("Guided entry")',
}
const missing = []
for (const [name, selector] of Object.entries(surfacesToVerify)) {
  if (name === 'chatDock') continue
  const count = await reportPage.locator(selector).count()
  if (count > 0) missing.push(`${name} (${selector}): ${count}`)
}
console.log('109) Verborgene Schreibflaechen in der Kopie:', missing.length ? missing.join(', ') : 'keine')
if (missing.length) fail('Schreibflaechen sind in der Berichtskopie noch sichtbar: ' + missing.join(', '))

// Umgekehrt: CSV/JSON-Export und die Berichtskopie-Aktion selbst bleiben da.
const kept = ['Export JSON', 'CSV for Excel', 'Export a read-only copy']
for (const label of kept) {
  const count = await reportPage.getByRole('button', { name: label }).count()
  if (!count) fail(`Aktion "${label}" fehlt in der Berichtskopie`)
}
console.log('110) Lesende Aktionen weiterhin sichtbar: CSV/JSON-Export + erneuter Berichtskopie-Export')

// Strg+S darf nichts ausloesen - Sicherheitsnetz fuer den Fall, dass jemand die
// Schreibflaeche spaeter oeffnet (z.B. ueber das Formular im Original).
const beforeDirty = await reportPage.evaluate(() => null)
await reportPage.keyboard.press('Control+S')
await reportPage.waitForTimeout(200)
const stillReadOnly = await reportPage.locator('.report-banner').count()
console.log('111) Strg+S ohne Wirkung in der Kopie:', stillReadOnly === 1 ? 'ja' : 'nein')
if (stillReadOnly !== 1) fail('Strg+S loest in der Berichtskopie doch einen Schreibpfad aus')

await reportPage.screenshot({ path: resolve(tmp, 'berichtskopie.png'), fullPage: false })
await reportPage.close()
await reportCtx.close()
await pageReport.close()

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
