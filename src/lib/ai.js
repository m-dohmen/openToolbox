// SPDX-License-Identifier: Apache-2.0
import { t, DEFAULT_LOCALE } from '../i18n.js'
import { isSingleEntity, computeCounts, materialize } from './entities.js'

/**
 * Anbindung an einen OpenAI-kompatiblen Endpunkt (Azure AI Foundry, LiteLLM,
 * Vertex über den Kompatibilitätslayer, vLLM, Ollama, OpenRouter …).
 *
 * "OpenAI-kompatibel" ist kein Standard, sondern eine Familie von Dialekten.
 * Deshalb wird der Aufruf nicht fest verdrahtet, sondern ausgehandelt: die
 * Anwendung startet mit der breitest unterstützten Variante, liest bei einem
 * 400er aus der Fehlermeldung, was der Endpunkt anders will, passt an und
 * versucht es erneut. Was dabei gelernt wurde, landet in den Einstellungen und
 * reist mit der Datei mit — beim nächsten Öffnen sitzt der erste Aufruf.
 *
 * Zwei Dinge, die man beim Aufruf aus einer lokalen Datei wissen muss:
 *
 *  1. Die Herkunft ist "null". Der Endpunkt muss CORS für diese Herkunft
 *     erlauben, sonst blockt der Browser, bevor irgendetwas gesendet wird.
 *     Ein davorgeschalteter Proxy (LiteLLM, API Management) ist der übliche Weg.
 *  2. Es wird nicht gestreamt. Eine Antwort, ein Aufruf — das hält den Code
 *     klein und macht Fehler im Zweifel eindeutig.
 */

export const AI_DEFAULTS = {
  enabled: false,
  baseUrl: '',
  model: '',
  auth: 'bearer',
  headers: '',
  storeKey: false,
  systemPrompt:
    'You help analyse a list of action items. Answer concisely, base every statement strictly on ' +
    'the records provided, and say so plainly when the data does not answer a question.',
  temperature: 0.2,
  maxTokens: 1200,
  context: 'sichtbar',
  allowWrite: true,
  autoApply: false,
  dialect: null,
}

/** Textartige Dateien, die als Anhang angenommen werden. */
export const TEXT_EXTENSIONS = [
  'txt', 'md', 'markdown', 'conf', 'cfg', 'ini', 'env', 'properties',
  'csv', 'tsv', 'json', 'yaml', 'yml', 'xml', 'log', 'sql', 'sh', 'bat', 'rst', 'adoc',
]

export const ATTACHMENT_ACCEPT =
  TEXT_EXTENSIONS.map((e) => '.' + e).join(',') + ',text/*'

export const isTextFile = (file) => {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  return TEXT_EXTENSIONS.includes(ext) || (file.type || '').startsWith('text/')
}

/** Startannahme: das, was die meisten Endpunkte verstehen. */
export const DIALECT_DEFAULT = {
  tokenParam: 'max_tokens',
  sendTemperature: true,
  systemRole: 'system',
  appendV1: false,
  drop: [],
}

/**
 * `tr` ist ein gebundener Übersetzer aus i18n.js, siehe translator(locale).
 * Ohne Angabe (interner Aufruf aus chatCompletion für die Fehlermeldung beim
 * Aushandeln) fällt es auf DEFAULT_LOCALE zurück - dort geht es nicht um die
 * Oberfläche, sondern um eine Diagnosezeile im geworfenen Error.
 */
export const dialectSummary = (d, tr = (key, ...args) => t(DEFAULT_LOCALE, key, ...args)) => {
  if (!d) return tr('dialect.notNegotiated')
  const parts = [d.tokenParam, tr(d.sendTemperature ? 'dialect.withTemperature' : 'dialect.withoutTemperature')]
  if (d.systemRole !== 'system') parts.push(tr('dialect.systemRoleAs', d.systemRole))
  if (d.appendV1) parts.push(tr('dialect.v1Appended'))
  if (d.drop?.length) parts.push(tr('dialect.without', d.drop.join(', ')))
  return parts.join(' · ')
}

const CONTEXT_LIMIT = 60_000
const ATTACHMENT_LIMIT = 120_000
const MAX_ATTEMPTS = 6

export const CONTEXT_MODE_VALUES = ['sichtbar', 'alle', 'kennzahlen']

/** [value, übersetztes Label]-Paare für Segmented - `tr` aus i18n.js. */
export const contextModeOptions = (tr) => CONTEXT_MODE_VALUES.map((v) => [v, tr(`contextMode.${v}`)])

/* ── Kontext ──────────────────────────────────────────────────── */

/** Baut den Datenteil des System-Prompts. Wird vor jedem Aufruf neu erzeugt. */
function attachmentBlock(attachments) {
  if (!attachments?.length) return ''
  const budget = Math.floor(ATTACHMENT_LIMIT / attachments.length)
  const parts = attachments.map((file) => {
    const cut = file.text.length > budget
    const body = cut ? file.text.slice(0, budget) : file.text
    return (
      `--- File: ${file.name} (${file.text.length} characters` +
      `${cut ? `, truncated to ${budget}` : ''}) ---\n${body}`
    )
  })
  return `\n\nFiles attached by the user:\n${parts.join('\n\n')}`
}

function countsSummary(entityKey, entity, records, single) {
  const c = computeCounts(entity, records)
  const prefix = single ? '' : `Entity "${entityKey}" - `
  return [
    `${prefix}Records in total: ${c.total}`,
    `${prefix}of those overdue: ${c.overdue}`,
    `${prefix}open total (of the schema's total field): ${c.total_sum}`,
    ...Object.entries(c.facets).map(([key, dist]) => `${prefix}by ${key}: ${JSON.stringify(dist)}`),
  ].join('\n')
}

/**
 * `entities`/`recordsByEntity` decken alle Entitäten ab; `visible` ist bereits
 * die gefilterte Ansicht der gerade aktiven Entität (`activeKey`), berechnet
 * von der aufrufenden Komponente (Tabellenfilter/-suche liegen dort).
 */
export function buildContext({ mode, entities, recordsByEntity, visible, activeKey, attachments }) {
  const single = isSingleEntity(entities)

  if (mode === 'kennzahlen') {
    const summary = Object.entries(entities)
      .map(([key, entity]) => countsSummary(key, entity, recordsByEntity[key] ?? [], single))
      .join('\n\n')
    return (
      `Aggregates for this file:\n${summary}\n\n(Individual records were deliberately withheld.)` +
      attachmentBlock(attachments)
    )
  }

  const summary = countsSummary(activeKey, entities[activeKey], recordsByEntity[activeKey] ?? [], single)
  // Berechnete Felder werden mitgeschickt - das Modell soll ueber Punktwerte
  // und Restlaufzeiten reden koennen. Zurueckschreiben darf es sie nicht, das
  // steht in den Anweisungen und wird bei der Pruefung abgelehnt.
  const withComputed = (key, list) => list.map((r) => materialize(entities[key], r))
  const rows =
    mode === 'alle'
      ? single
        ? withComputed(activeKey, recordsByEntity[activeKey] ?? [])
        : Object.fromEntries(
            Object.entries(recordsByEntity).map(([key, list]) => [key, withComputed(key, list)]),
          )
      : withComputed(activeKey, visible)
  let json = JSON.stringify(rows)
  let note = ''

  if (json.length > CONTEXT_LIMIT) {
    // Kürzung nur sinnvoll für ein flaches Array - bei "alle" über mehrere
    // Entitäten hinweg wird stattdessen nur ein Hinweis ergänzt, kein Datensatz
    // stillschweigend abgeschnitten.
    if (Array.isArray(rows)) {
      const keep = Math.max(1, Math.floor((rows.length * CONTEXT_LIMIT) / json.length))
      json = JSON.stringify(rows.slice(0, keep))
      note = `\n\nNote: for space reasons only the first ${keep} of ${rows.length} records were included.`
    } else {
      note = '\n\nNote: the full multi-entity record set is large; consider the "Aggregates" context mode instead.'
    }
  }

  const label =
    mode === 'alle'
      ? single ? 'All records' : 'All records, per entity'
      : single ? 'Records in the currently filtered view' : `Records in the currently filtered view of entity "${activeKey}"`

  return (
    `Aggregates for this file:\n${summary}\n\n${label} as JSON:\n${json}${note}` +
    attachmentBlock(attachments)
  )
}

/* ── Schema und Schreibprotokoll ──────────────────────────────── */

const fieldLine = (f) => {
  const type =
    f.type === 'enum'
      ? `one of: ${f.values.join(' | ')}`
      : f.type === 'reference'
        ? `reference to entity "${f.entity}" (its id, or the target record's title text)`
        : f.type === 'date'
          ? 'date as YYYY-MM-DD'
          : f.type === 'number'
            ? 'number'
            : f.type === 'computed'
              ? 'calculated from the other fields, read-only - never set it'
              : 'text'
  return `  ${f.key} (${f.label}): ${type}${f.required ? ', required' : ''}`
}

/**
 * Beschreibt dem Modell den Datensatz (bzw. bei mehreren Entitäten: alle
 * Entitäten und ihre Beziehungen zueinander) und - falls erlaubt - wie es
 * Änderungen vorschlägt. Bewusst als Textprotokoll statt über Tool-Calling:
 * die Hälfte der kompatiblen Endpunkte unterstützt Werkzeuge gar nicht oder anders.
 */
/* Die Regeln aus dem Schema als Saetze. Ihre Bedingungen sind Funktionen und
   damit nicht uebertragbar - der `message`-Text ist es, und genau der ist die
   Begruendung, die das Modell spaeter zurueckbekaeme, wenn es sie verletzt.
   Ihn vorher mitzuliefern spart den Fehlversuch. */
function ruleLines(schema) {
  const rules = (schema.rules ?? [])
    .map((r) => (typeof r.message === 'function' ? null : r.message))
    .filter(Boolean)
  return rules.length ? `\n  Constraints on a whole record:\n${rules.map((m) => `    - ${m}`).join('\n')}` : ''
}

export function buildInstructions(entities, allowWrite) {
  const single = isSingleEntity(entities)
  const entries = Object.entries(entities)

  const base = single
    ? (() => {
        const schema = entries[0][1].schema
        return `Shape of one record (${schema.singular}), identifier in field ${schema.idField}:\n${schema.fields.map(fieldLine).join('\n')}${ruleLines(schema)}`
      })()
    : entries
        .map(([key, entity]) => {
          const schema = entity.schema
          return `Entity "${key}" (${schema.plural}), identifier in field ${schema.idField}:\n${schema.fields.map(fieldLine).join('\n')}${ruleLines(schema)}`
        })
        .join('\n\n')

  if (!allowWrite) {
    return `${base}\n\nYou can only read the data. Changes are not possible.`
  }

  const entityHint = single ? '' : ' Include "entity" naming which of the entities above each operation targets.'
  const refHint = single ? '' : ' For a reference-type field, give either the exact id or the target record\'s title text.'

  return (
    `${base}\n\n` +
    'If and only if the user explicitly asks for a change to the data, append a fenced code block ' +
    `with the language tag "aktionen" containing a JSON array. Allowed operations:${entityHint}\n` +
    `  {"op":"create"${single ? '' : ',"entity":"…"'},"record":{…fields…}}\n` +
    `  {"op":"update"${single ? '' : ',"entity":"…"'},"id":"…","changes":{…changed fields only…}}\n` +
    `  {"op":"delete"${single ? '' : ',"entity":"…"'},"id":"…"}\n` +
    `Identifiers for new records are assigned by the application, do not invent them.${refHint} Explain ` +
    'your proposal briefly in plain text before the block. For plain questions, append no block.'
  )
}

/**
 * Holt Aktionsblöcke aus der Antwort und gibt den bereinigten Text zurück.
 * Tolerant gegenüber der Auszeichnung: aktionen, actions, json - Hauptsache
 * ein Array aus Objekten mit einem op-Feld.
 */
export function extractActions(answer) {
  let actions = []

  const take = (raw) => {
    try {
      const parsed = JSON.parse(raw.trim())
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.aktionen)
          ? parsed.aktionen
          : Array.isArray(parsed?.actions)
            ? parsed.actions
            : null
      if (list?.length && list.every((x) => x && typeof x === 'object' && 'op' in x)) {
        actions = actions.concat(list)
        return true
      }
    } catch {
      /* kein JSON - Block bleibt Text */
    }
    return false
  }

  const cleaned = answer
    .replace(/```[\w-]*\s*\n?([\s\S]*?)```/g, (whole, body) => (take(body) ? '' : whole))
    .trim()

  if (!actions.length && cleaned.startsWith('[') && take(cleaned)) {
    return { text: '', actions }
  }

  return { text: cleaned, actions }
}

/* ── Aufrufaufbau ─────────────────────────────────────────────── */

/**
 * Ergänzt den Pfad nur, wenn nötig, und lässt eine Query stehen —
 * Azure braucht sein ?api-version=… am Ende.
 */
export function buildUrl(baseUrl, appendV1) {
  let url = baseUrl.trim()
  let query = ''
  const cut = url.indexOf('?')
  if (cut >= 0) {
    query = url.slice(cut)
    url = url.slice(0, cut)
  }
  url = url.replace(/\/+$/, '')
  if (!/\/chat\/completions$/.test(url)) {
    if (appendV1 && !/\/v\d+$/.test(url)) url += '/v1'
    url += '/chat/completions'
  }
  return url + query
}

/** Was tatsächlich aufgerufen wird — hilfreich beim Einrichten. */
export const resolveUrl = (config) =>
  config?.baseUrl ? buildUrl(config.baseUrl, config.dialect?.appendV1 ?? false) : ''

/** Freitextfeld "Name: Wert" je Zeile in echte Kopfzeilen übersetzen. */
export function parseHeaders(text) {
  const out = {}
  for (const line of String(text || '').split('\n')) {
    const at = line.indexOf(':')
    if (at < 1) continue
    const name = line.slice(0, at).trim()
    const value = line.slice(at + 1).trim()
    if (name && value) out[name] = value
  }
  return out
}

function prepareMessages(messages, systemRole) {
  if (systemRole === 'system') return messages
  if (systemRole === 'developer') {
    return messages.map((m) => (m.role === 'system' ? { ...m, role: 'developer' } : m))
  }
  // Letzte Rückfallebene: Systemanweisung in die erste Nutzernachricht falten.
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const rest = messages.filter((m) => m.role !== 'system')
  if (!system.length) return rest
  const [first, ...others] = rest
  return [
    { role: 'user', content: `${system.join('\n\n')}\n\n---\n\n${first?.content ?? ''}` },
    ...others,
  ]
}

function buildBody(config, messages, dialect) {
  const body = {
    model: config.model,
    messages: prepareMessages(messages, dialect.systemRole),
  }
  body[dialect.tokenParam] = Number(config.maxTokens) || 1024
  if (dialect.sendTemperature && config.temperature != null) {
    body.temperature = Number(config.temperature)
  }
  for (const key of dialect.drop) delete body[key]
  return body
}

/* ── Fehleranalyse ────────────────────────────────────────────── */

const NEVER_DROP = ['model', 'messages']

function readError(raw) {
  try {
    const parsed = JSON.parse(raw)
    const err = parsed?.error ?? parsed
    return {
      message: String(err?.message ?? raw ?? ''),
      param: err?.param ? String(err.param) : '',
    }
  } catch {
    return { message: String(raw ?? ''), param: '' }
  }
}

/**
 * Leitet aus einer Fehlermeldung die nächste Variante ab.
 * Gibt null zurück, wenn nichts mehr zu drehen ist.
 */
function adapt(dialect, status, raw, body) {
  const { message, param } = readError(raw)
  const text = (message + ' ' + param).toLowerCase()
  const next = { ...dialect, drop: [...dialect.drop] }

  // Falscher Pfad: einmal mit ergänztem /v1 nachfassen.
  if ((status === 404 || status === 405) && !dialect.appendV1) {
    next.appendV1 = true
    return next
  }

  if (status !== 400 && status !== 422) return null

  // Token-Parameter in beide Richtungen.
  if (text.includes('max_completion_tokens') && dialect.tokenParam === 'max_tokens') {
    next.tokenParam = 'max_completion_tokens'
    return next
  }
  if (
    text.includes('max_tokens') &&
    dialect.tokenParam === 'max_completion_tokens' &&
    !text.includes('max_completion_tokens')
  ) {
    next.tokenParam = 'max_tokens'
    return next
  }

  // Modelle mit fester Temperatur.
  if (text.includes('temperature') && dialect.sendTemperature) {
    next.sendTemperature = false
    return next
  }

  // Systemrolle: erst developer, dann in die Nutzernachricht falten.
  if (text.includes('developer') && dialect.systemRole === 'developer') {
    next.systemRole = 'user'
    return next
  }
  if (text.includes('system')) {
    if (dialect.systemRole === 'system') {
      next.systemRole = 'developer'
      return next
    }
    if (dialect.systemRole === 'developer') {
      next.systemRole = 'user'
      return next
    }
  }

  // Allgemeine Regel: nennt der Endpunkt ein Feld, das wir gesendet haben,
  // fliegt es raus und wir versuchen es noch einmal ohne.
  const named = param || Object.keys(body).find((k) => text.includes(k.toLowerCase()))
  if (named && named in body && !NEVER_DROP.includes(named) && !dialect.drop.includes(named)) {
    next.drop.push(named)
    return next
  }

  return null
}

/* ── Antwortauswertung ────────────────────────────────────────── */

function extractText(data) {
  const choice = data?.choices?.[0]
  const message = choice?.message

  let content = message?.content
  if (Array.isArray(content)) {
    content = content
      .map((part) => (typeof part === 'string' ? part : (part?.text ?? part?.content ?? '')))
      .join('')
  }
  if (typeof content === 'string' && content.trim()) return content.trim()

  // Reasoning-Modelle und einzelne Gateways legen den Text woanders ab.
  for (const candidate of [
    message?.reasoning_content,
    message?.refusal,
    choice?.text,
    data?.output_text,
    typeof data?.content === 'string' ? data.content : null,
  ]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  if (choice?.finish_reason === 'length') {
    throw new Error(
      'The model hit the token limit before producing an answer. Reasoning models spend part of ' +
        'the budget on internal thinking — raise the answer length in the settings.',
    )
  }

  throw new Error(
    'The response contains no usable text. Raw beginning: ' +
      JSON.stringify(data).slice(0, 200),
  )
}

/* ── Aufruf ───────────────────────────────────────────────────── */

/**
 * Führt den Aufruf aus und handelt dabei den Dialekt aus.
 * `onDialect` wird nur gerufen, wenn sich dabei etwas geändert hat.
 */
export async function chatCompletion({ config, apiKey, messages, signal, onDialect }) {
  if (!config.baseUrl) throw new Error('No endpoint configured.')
  if (!config.model) throw new Error('No model name configured.')

  const started = { ...DIALECT_DEFAULT, ...(config.dialect ?? {}) }
  let dialect = started
  const tried = []

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const url = buildUrl(config.baseUrl, dialect.appendV1)
    const body = buildBody(config, messages, dialect)

    const headers = { 'Content-Type': 'application/json', ...parseHeaders(config.headers) }
    if (apiKey) {
      if (config.auth === 'api-key') headers['api-key'] = apiKey
      else headers['Authorization'] = `Bearer ${apiKey}`
    }

    let response
    try {
      response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal })
    } catch (err) {
      if (err?.name === 'AbortError') throw err
      throw new Error(
        'The request never left the browser. From a local file the origin is "null" — the endpoint ' +
          'has to allow it via CORS, which usually means putting a proxy in front. Also check the ' +
          'URL and whether this machine can reach the endpoint at all.',
      )
    }

    if (response.ok) {
      const data = await response.json()
      const text = extractText(data)
      if (onDialect && JSON.stringify(dialect) !== JSON.stringify(started)) onDialect(dialect)
      return text
    }

    const raw = await response.text().catch(() => '')

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `The endpoint rejected the credentials (HTTP ${response.status}). Check the key and the ` +
          'authentication mode — Azure AI Foundry expects api-key, most others Bearer.',
      )
    }

    const next = adapt(dialect, response.status, raw, body)
    if (!next) {
      const path = tried.length ? ` Tried without success: ${tried.join(' → ')}.` : ''
      throw new Error(
        `The endpoint answered HTTP ${response.status}. ` +
          `${readError(raw).message.slice(0, 300)}${path}`,
      )
    }

    tried.push(dialectSummary(next))
    dialect = next
  }

  throw new Error(
    `The endpoint accepted none of the ${MAX_ATTEMPTS} attempted variants. ` +
      `Tried: ${tried.join(' → ')}.`,
  )
}
