// SPDX-License-Identifier: Apache-2.0
/**
 * Vom Modell vorgeschlagene Änderungen prüfen, in lesbare Sätze übersetzen und
 * anwenden. Nichts hiervon vertraut der Antwort: unbekannte Felder fliegen raus,
 * Aufzählungswerte müssen zum Schema passen, IDs müssen existieren. Was nicht
 * sauber ist, wird abgelehnt und benannt statt still verschluckt.
 *
 * Arbeitet über mehrere Entitäten hinweg: `recordsByEntity` ist ein Objekt
 * `{ [entityKey]: Datensätze[] }`, `entities` die normalisierte Map aus
 * src/lib/entities.js. Eine Aktion trägt optional `entity` - fehlt es, greift
 * `defaultEntityKey` (Rückwärtskompatibilität für Domains mit nur einer
 * Entität, wo das Protokoll bisher kein `entity`-Feld kannte).
 *
 * `tr` ist ein gebundener Übersetzer aus i18n.js (siehe translator(locale)) -
 * die Sätze richten sich nach der in den Einstellungen gewählten Oberflächensprache,
 * unabhängig von der Sprache der Feldnamen und Daten selbst.
 */

import { resolveReferenceTitle } from './entities.js'

const OPS = ['create', 'update', 'delete']

const findField = (schema, key) => schema.fields.find((f) => f.key === key)

/** Aufzählungswerte tolerant zuordnen — Groß- und Kleinschreibung, Leerzeichen. */
function matchEnum(values, raw) {
  const needle = String(raw).trim().toLowerCase()
  return values.find((v) => v.toLowerCase() === needle) ?? null
}

/** Referenzwert tolerant auflösen: erst per Id, dann per Titelfeld-Text. */
function matchReference(entities, recordsByEntity, field, raw) {
  const target = entities[field.entity]
  if (!target) return null
  const pool = recordsByEntity[field.entity] ?? []
  const byId = pool.find((r) => String(r[target.schema.idField]) === String(raw))
  if (byId) return byId[target.schema.idField]
  const needle = String(raw).trim().toLowerCase()
  const byTitle = pool.find((r) => String(r[target.schema.titleField]).toLowerCase() === needle)
  return byTitle ? byTitle[target.schema.idField] : null
}

function coerce(schema, key, raw, problems, where, tr, entities, recordsByEntity) {
  const field = findField(schema, key)
  if (!field) {
    problems.push(tr('actions.notField', where, key))
    return undefined
  }

  if (field.type === 'enum') {
    const hit = matchEnum(field.values, raw)
    if (!hit) {
      problems.push(tr('actions.notEnum', where, raw, field.label, field.values.join(', ')))
      return undefined
    }
    return hit
  }

  if (field.type === 'reference') {
    const id = matchReference(entities, recordsByEntity, field, raw)
    if (id === null) {
      problems.push(tr('actions.notReference', where, raw, field.label))
      return undefined
    }
    return id
  }

  if (field.type === 'number') {
    const n = Number(raw)
    if (Number.isNaN(n)) {
      problems.push(tr('actions.notNumber', where, raw, field.label))
      return undefined
    }
    return n
  }

  if (field.type === 'date') {
    const value = String(raw).trim()
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      problems.push(tr('actions.notDate', where, raw))
      return undefined
    }
    return value
  }

  return raw == null ? '' : String(raw)
}

/** Anzeigewert für ein Feld - Referenzen werden zum Titel des Ziels aufgelöst. */
function displayValue(entities, recordsByEntity, schema, key, value) {
  const field = findField(schema, key)
  if (field?.type === 'reference') {
    return resolveReferenceTitle(entities, recordsByEntity, field.entity, value) ?? value
  }
  return value
}

/**
 * Wendet eine Liste von Aktionen an und liefert den neuen Stand (pro Entität),
 * eine Beschreibung des Geschehenen und die Beanstandungen.
 */
export function applyActions(recordsByEntity, actions, entities, tr, defaultEntityKey) {
  const next = {}
  for (const [key, records] of Object.entries(recordsByEntity)) {
    next[key] = records.map((r) => ({ ...r }))
  }
  const done = []
  const problems = []
  const knownEntities = Object.keys(entities).join(', ')

  actions.forEach((action, index) => {
    const where = tr('actions.action', index + 1)
    const op = String(action?.op ?? '').toLowerCase()

    if (!OPS.includes(op)) {
      problems.push(tr('actions.unknownOp', where, action?.op))
      return
    }

    const entityKey = action?.entity ?? defaultEntityKey
    if (!entities[entityKey]) {
      problems.push(tr('actions.unknownEntity', where, action.entity, knownEntities))
      return
    }
    const entity = entities[entityKey]
    const schema = entity.schema

    if (op === 'create') {
      const record = { ...entity.emptyRecord() }
      const source = action.record ?? action.changes ?? {}
      for (const [key, value] of Object.entries(source)) {
        if (key === schema.idField) continue
        const clean = coerce(schema, key, value, problems, where, tr, entities, next)
        if (clean !== undefined) record[key] = clean
      }
      if (!record[schema.titleField]) {
        problems.push(tr('actions.needsTitle', where, schema.titleField))
        return
      }
      record[schema.idField] = entity.uid()
      next[entityKey].push(record)
      done.push(tr('actions.created', record[schema.titleField], record[schema.idField]))
      return
    }

    const id = String(action.id ?? action[schema.idField] ?? '').trim()
    const position = next[entityKey].findIndex((r) => String(r[schema.idField]) === id)
    if (position < 0) {
      problems.push(tr('actions.notFound', where, id))
      return
    }

    if (op === 'delete') {
      const [removed] = next[entityKey].splice(position, 1)
      done.push(tr('actions.deleted', removed[schema.titleField], id))
      return
    }

    const changes = action.changes ?? action.record ?? {}
    const applied = []
    for (const [key, value] of Object.entries(changes)) {
      if (key === schema.idField) continue
      const clean = coerce(schema, key, value, problems, where, tr, entities, next)
      if (clean === undefined) continue
      const before = next[entityKey][position][key]
      if (String(before) === String(clean)) continue
      next[entityKey][position][key] = clean
      const beforeShown = displayValue(entities, next, schema, key, before)
      const afterShown = displayValue(entities, next, schema, key, clean)
      applied.push(`${findField(schema, key).label}: ${beforeShown || '—'} → ${afterShown || '—'}`)
    }
    if (applied.length) done.push(tr('actions.updated', id, applied.join(', ')))
    else problems.push(tr('actions.nothingToChange', where, id))
  })

  return { next, done, problems }
}

/** Kurzfassung für die Rückfrage, bevor irgendetwas angefasst wird. */
export function describeActions(recordsByEntity, actions, entities, tr, defaultEntityKey) {
  return actions.map((action, index) => {
    const op = String(action?.op ?? '').toLowerCase()
    const entityKey = entities[action?.entity] ? action.entity : defaultEntityKey
    const entity = entities[entityKey]
    if (!entity) return tr('actions.describeUnknown', index + 1)
    const schema = entity.schema
    const id = String(action.id ?? '').trim()
    const known = (recordsByEntity[entityKey] ?? []).find((r) => String(r[schema.idField]) === id)

    if (op === 'create') {
      const source = action.record ?? action.changes ?? {}
      return tr('actions.describeCreate', source[schema.titleField] ?? tr('actions.noTitle'))
    }
    if (op === 'delete') {
      return tr('actions.describeDelete', known?.[schema.titleField] ?? tr('actions.unknown'), id)
    }
    if (op === 'update') {
      const changes = action.changes ?? action.record ?? {}
      const parts = Object.entries(changes)
        .filter(([key]) => key !== schema.idField)
        .map(([key, value]) => {
          const shown = displayValue(entities, recordsByEntity, schema, key, value)
          return `${findField(schema, key)?.label ?? key} → ${shown}`
        })
      return tr('actions.describeUpdate', id, known?.[schema.titleField], parts.join(', '))
    }
    return tr('actions.describeUnknown', index + 1)
  })
}
