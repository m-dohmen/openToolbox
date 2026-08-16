// SPDX-License-Identifier: Apache-2.0
/**
 * Normalisiert domain.js zu einer einheitlichen Entity-Map, egal ob dort ein
 * einzelnes SCHEMA (bisheriges Format, ein Datensatztyp) oder mehrere
 * ENTITIES (mehrere Datensatztypen, ggf. mit Reference-Feldern
 * untereinander) exportiert werden. Der Rest der Anwendung kennt nur noch
 * diese eine Form:
 *
 *   { [entityKey]: { schema, uid, emptyRecord, seed, isDone, isOverdue, formatDate } }
 *
 * Ein bestehendes domain.js mit einem einzelnen SCHEMA-Export (wie
 * src/domain.js und examples/risk-register.domain.js) funktioniert
 * unverändert weiter - es wird intern unter SINGLE_ENTITY_KEY eingehängt.
 * formatDate ist bewusst meist EIN gemeinsamer Export (Datumsformat ändert
 * sich selten pro Entity), kann aber pro Entity überschrieben werden.
 */

export const SINGLE_ENTITY_KEY = 'records'

export function normalizeEntities(domain) {
  if (domain.ENTITIES) {
    const out = {}
    for (const [key, entity] of Object.entries(domain.ENTITIES)) {
      out[key] = { formatDate: domain.formatDate, ...entity }
    }
    return out
  }
  return {
    [SINGLE_ENTITY_KEY]: {
      schema: domain.SCHEMA,
      uid: domain.uid,
      emptyRecord: domain.emptyRecord,
      seed: domain.seed,
      isDone: domain.isDone,
      isOverdue: domain.isOverdue,
      formatDate: domain.formatDate,
    },
  }
}

export const isSingleEntity = (entities) => Object.keys(entities).length === 1

/** Alle Reference-Felder eines Schemas. */
export const referenceFields = (schema) => schema.fields.filter((f) => f.type === 'reference')

export const findField = (schema, key) => schema.fields.find((f) => f.key === key)

/* ── Berechnete Felder ────────────────────────────────────────── */

/** Felder, die der Anwender selbst füllt - alles außer den berechneten. */
export const writableFields = (schema) => schema.fields.filter((f) => f.type !== 'computed')

/**
 * Wert eines Feldes. Berechnete Felder werden hier ausgerechnet und liegen
 * bewusst NIE im Datensatz: gespeicherte Ableitungen veralten in dem Moment,
 * in dem sich eine ihrer Quellen ändert, und niemand merkt es.
 *
 * `compute` stammt aus domain.js und ist damit ebenso vertrauenswürdig wie
 * isDone/isOverdue - eine kaputte Formel soll aber die Tabelle nicht sprengen,
 * deshalb der Fangarm.
 */
export function fieldValue(entity, record, key) {
  const field = findField(entity.schema, key)
  if (field?.type !== 'computed') return record[key]
  try {
    return field.compute(record) ?? ''
  } catch {
    return ''
  }
}

/** Datensatz mit ausgerechneten Feldern - für Export, Sortierung, KI-Kontext. */
export function materialize(entity, record) {
  const computed = entity.schema.fields.filter((f) => f.type === 'computed')
  if (!computed.length) return record
  const out = { ...record }
  for (const f of computed) out[f.key] = fieldValue(entity, record, f.key)
  return out
}

/* ── Typprüfung ───────────────────────────────────────────────── */

/** Aufzählungswerte tolerant zuordnen — Groß- und Kleinschreibung, Leerzeichen. */
function matchEnum(values, raw) {
  const needle = String(raw).trim().toLowerCase()
  return values.find((v) => v.toLowerCase() === needle) ?? null
}

/** Referenzwert tolerant auflösen: erst per Id, dann per Titelfeld-Text. */
function matchReference(entities, recordsByEntity, field, raw) {
  const target = entities?.[field.entity]
  if (!target) return null
  const pool = recordsByEntity?.[field.entity] ?? []
  const byId = pool.find((r) => String(r[target.schema.idField]) === String(raw))
  if (byId) return byId[target.schema.idField]
  const needle = String(raw).trim().toLowerCase()
  const byTitle = pool.find((r) => String(r[target.schema.titleField]).toLowerCase() === needle)
  return byTitle ? byTitle[target.schema.idField] : null
}

/**
 * Einen Rohwert gegen die Felddefinition prüfen und umwandeln. Einzige Stelle,
 * an der Typregeln stehen - benutzt von den KI-Vorschlägen (lib/actions.js) und
 * vom CSV-Import (app.jsx). Liefert bewusst einen Fehler*code* statt eines
 * fertigen Satzes, damit beide Aufrufer ihn in ihrem eigenen Wortlaut und in
 * der eingestellten Oberflächensprache formulieren können.
 *
 *   { ok: true, value }  |  { ok: false, code, params }
 *
 * code ist einer von: notField, notEnum, notReference, notNumber, notDate.
 * params passt jeweils zu den gleichnamigen i18n-Schlüsseln unter actions.*.
 */
export function coerceField(schema, key, raw, { entities, recordsByEntity } = {}) {
  const field = findField(schema, key)
  if (!field) return { ok: false, code: 'notField', params: [key] }

  // Berechnete Felder ergeben sich aus den anderen; sie zu setzen hiesse, die
  // Formel zu umgehen und einen Wert zu hinterlegen, der beim naechsten Rendern
  // wieder verschwindet.
  if (field.type === 'computed') return { ok: false, code: 'readOnly', params: [field.label] }

  if (field.type === 'enum') {
    const hit = matchEnum(field.values, raw)
    if (!hit) return { ok: false, code: 'notEnum', params: [raw, field.label, field.values.join(', ')] }
    return { ok: true, value: hit }
  }

  if (field.type === 'reference') {
    const id = matchReference(entities, recordsByEntity, field, raw)
    if (id === null) return { ok: false, code: 'notReference', params: [raw, field.label] }
    return { ok: true, value: id }
  }

  if (field.type === 'number') {
    const n = Number(raw)
    if (Number.isNaN(n)) return { ok: false, code: 'notNumber', params: [raw, field.label] }
    return { ok: true, value: n }
  }

  if (field.type === 'date') {
    const value = String(raw).trim()
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { ok: false, code: 'notDate', params: [raw] }
    }
    return { ok: true, value }
  }

  return { ok: true, value: raw == null ? '' : String(raw) }
}

/**
 * Datensätze in `entities`/`recordsByEntity`, deren Reference-Feld auf
 * `targetId` in `targetKey` zeigt - die Grundlage für den Lösch-Schutz.
 */
export function findReferencingRecords(entities, recordsByEntity, targetKey, targetId) {
  const hits = []
  for (const [key, entity] of Object.entries(entities)) {
    for (const field of referenceFields(entity.schema)) {
      if (field.entity !== targetKey) continue
      for (const record of recordsByEntity[key] ?? []) {
        if (record[field.key] === targetId) {
          hits.push({ entityKey: key, entity, record, field })
        }
      }
    }
  }
  return hits
}

/** Anzeigename (titleField) des referenzierten Datensatzes, oder null. */
export function resolveReferenceTitle(entities, recordsByEntity, entityKey, id) {
  const entity = entities[entityKey]
  if (!entity || !id) return null
  const record = (recordsByEntity[entityKey] ?? []).find((r) => r[entity.schema.idField] === id)
  return record ? record[entity.schema.titleField] : null
}

/**
 * Kennzahlen für eine Entität: Gesamtzahl, überfällig, Summe des Total-Felds,
 * Verteilung je Facette. Einzige Quelle dafür - App-Übersicht und die
 * "Kennzahlen"-Kontextvariante der KI (buildContext in lib/ai.js) rechnen
 * beide hiermit, statt die Logik zweimal zu pflegen.
 */
export function computeCounts(entity, records) {
  const schema = entity.schema
  const c = { total: records.length, overdue: 0, total_sum: 0, facets: {} }
  for (const key of schema.facets) c.facets[key] = {}
  for (const r of records) {
    if (entity.isOverdue(r)) c.overdue++
    if (schema.totalField && !entity.isDone(r)) {
      c.total_sum += Number(fieldValue(entity, r, schema.totalField)) || 0
    }
    for (const key of schema.facets) c.facets[key][r[key]] = (c.facets[key][r[key]] || 0) + 1
  }
  return c
}

/* ── Prüfregeln auf Datensatzebene ──────────────────────────────
 *
 * `coerceField` prüft einen Wert für sich: Typ, Aufzählungswert, Zieldatensatz
 * einer Referenz. Was es nicht sehen kann, sind Bedingungen zwischen Feldern -
 * "Kosten sind Pflicht, sobald der Status erledigt ist", "die Fälligkeit darf
 * nicht in der Vergangenheit liegen". Genau die stehen als `rules` im Schema
 * und werden hier ausgewertet.
 *
 * Eine Regel:
 *
 *   {
 *     when:    (r) => r.status === 'done',   // optional, sonst gilt sie immer
 *     require: ['cost'],                     // Kurzform: diese Felder gefüllt
 *     check:   (r) => r.due >= r.start,      // optional, true heißt in Ordnung
 *     message: 'Erledigte Punkte brauchen Kosten.',
 *     fields:  ['cost'],                     // optional, sonst `require`
 *   }
 *
 * Wichtig ist der eine Aufrufort: Formular, CSV-Import und die vom Modell
 * vorgeschlagenen Änderungen laufen alle hierdurch. Eine Regel im Schema härtet
 * damit alle drei Wege gleichzeitig, statt an drei Stellen nachgezogen zu werden.
 */

/** Leer im Sinne der Prüfung. Die Null bleibt ein Wert - sie ist oft gemeint. */
export const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === ''

/**
 * Prüft einen ganzen Datensatz. Liefert eine Liste von Beanstandungen
 * `{ message, fields }` - leer heißt in Ordnung.
 *
 * `tr` wird nur für die eingebaute Pflichtfeldmeldung gebraucht; die Texte der
 * Regeln stehen im Schema und damit in der Sprache, in der das Werkzeug gebaut
 * wurde - genau wie die Feldbeschriftungen.
 */
export function validateRecord(schema, record, tr) {
  const objections = []

  // Aus `required: true` am Feld. Bisher stand das nur in den Anweisungen an
  // das Modell und wurde nirgends durchgesetzt.
  for (const field of writableFields(schema)) {
    if (field.required && isBlank(record[field.key])) {
      objections.push({
        message: tr ? tr('validation.required', field.label) : `${field.label} is required.`,
        fields: [field.key],
      })
    }
  }

  for (const rule of schema.rules ?? []) {
    try {
      if (rule.when && !rule.when(record)) continue

      const missing = (rule.require ?? []).filter((key) => isBlank(record[key]))
      const failed = rule.check ? !rule.check(record) : false
      if (!missing.length && !failed) continue

      const message = typeof rule.message === 'function' ? rule.message(record) : rule.message
      objections.push({
        message: message ?? 'Invalid record.',
        fields: rule.fields ?? (missing.length ? missing : (rule.require ?? [])),
      })
    } catch (err) {
      // Eine Regel, die selbst wirft, darf das Speichern nicht blockieren -
      // aber sie soll auch nicht still verschwinden.
      objections.push({ message: `Rule failed: ${err.message}`, fields: rule.fields ?? [] })
    }
  }

  return objections
}
