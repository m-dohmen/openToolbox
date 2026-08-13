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
    if (schema.totalField && !entity.isDone(r)) c.total_sum += Number(r[schema.totalField]) || 0
    for (const key of schema.facets) c.facets[key][r[key]] = (c.facets[key][r[key]] || 0) + 1
  }
  return c
}
