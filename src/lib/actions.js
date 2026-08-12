// SPDX-License-Identifier: Apache-2.0
/**
 * Vom Modell vorgeschlagene Änderungen prüfen, in lesbare Sätze übersetzen und
 * anwenden. Nichts hiervon vertraut der Antwort: unbekannte Felder fliegen raus,
 * Aufzählungswerte müssen zum Schema passen, IDs müssen existieren. Was nicht
 * sauber ist, wird abgelehnt und benannt statt still verschluckt.
 */

const OPS = ['create', 'update', 'delete']

const findField = (schema, key) => schema.fields.find((f) => f.key === key)

/** Aufzählungswerte tolerant zuordnen — Groß- und Kleinschreibung, Leerzeichen. */
function matchEnum(values, raw) {
  const needle = String(raw).trim().toLowerCase()
  return values.find((v) => v.toLowerCase() === needle) ?? null
}

function coerce(schema, key, raw, problems, where) {
  const field = findField(schema, key)
  if (!field) {
    problems.push(`${where}: no such field "${key}", ignored.`)
    return undefined
  }

  if (field.type === 'enum') {
    const hit = matchEnum(field.values, raw)
    if (!hit) {
      problems.push(
        `${where}: "${raw}" is not a valid ${field.label}. Allowed: ${field.values.join(', ')}.`,
      )
      return undefined
    }
    return hit
  }

  if (field.type === 'number') {
    const n = Number(raw)
    if (Number.isNaN(n)) {
      problems.push(`${where}: "${raw}" is not a number for ${field.label}.`)
      return undefined
    }
    return n
  }

  if (field.type === 'date') {
    const value = String(raw).trim()
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      problems.push(`${where}: "${raw}" is not a date in YYYY-MM-DD format.`)
      return undefined
    }
    return value
  }

  return String(raw)
}

/**
 * Wendet eine Liste von Aktionen an und liefert den neuen Stand,
 * eine Beschreibung des Geschehenen und die Beanstandungen.
 */
export function applyActions(records, actions, schema, makeId, blank) {
  const next = records.map((r) => ({ ...r }))
  const done = []
  const problems = []

  actions.forEach((action, index) => {
    const where = `Action ${index + 1}`
    const op = String(action?.op ?? '').toLowerCase()

    if (!OPS.includes(op)) {
      problems.push(`${where}: "${action?.op}" is not a known operation.`)
      return
    }

    if (op === 'create') {
      const record = { ...blank() }
      const source = action.record ?? action.changes ?? {}
      for (const [key, value] of Object.entries(source)) {
        if (key === schema.idField) continue
        const clean = coerce(schema, key, value, problems, where)
        if (clean !== undefined) record[key] = clean
      }
      if (!record[schema.titleField]) {
        problems.push(`${where}: nothing is created without a ${schema.titleField}.`)
        return
      }
      record[schema.idField] = makeId()
      next.push(record)
      done.push(`Created: ${record[schema.titleField]} (${record[schema.idField]})`)
      return
    }

    const id = String(action.id ?? action[schema.idField] ?? '').trim()
    const position = next.findIndex((r) => String(r[schema.idField]) === id)
    if (position < 0) {
      problems.push(`${where}: ${id ? `"${id}"` : 'no id given'} — not found in the data.`)
      return
    }

    if (op === 'delete') {
      const [removed] = next.splice(position, 1)
      done.push(`Deleted: ${removed[schema.titleField]} (${id})`)
      return
    }

    const changes = action.changes ?? action.record ?? {}
    const applied = []
    for (const [key, value] of Object.entries(changes)) {
      if (key === schema.idField) continue
      const clean = coerce(schema, key, value, problems, where)
      if (clean === undefined) continue
      const before = next[position][key]
      if (String(before) === String(clean)) continue
      next[position][key] = clean
      applied.push(`${findField(schema, key).label}: ${before || '—'} → ${clean || '—'}`)
    }
    if (applied.length) done.push(`Updated ${id} — ${applied.join(', ')}`)
    else problems.push(`${where}: nothing to change on ${id}.`)
  })

  return { next, done, problems }
}

/** Kurzfassung für die Rückfrage, bevor irgendetwas angefasst wird. */
export function describeActions(records, actions, schema) {
  return actions.map((action, index) => {
    const op = String(action?.op ?? '').toLowerCase()
    const id = String(action.id ?? '').trim()
    const known = records.find((r) => String(r[schema.idField]) === id)

    if (op === 'create') {
      const source = action.record ?? action.changes ?? {}
      return `Create: ${source[schema.titleField] ?? '(no title)'}`
    }
    if (op === 'delete') {
      return `Delete: ${known?.[schema.titleField] ?? '(unknown)'} (${id})`
    }
    if (op === 'update') {
      const changes = action.changes ?? action.record ?? {}
      const parts = Object.entries(changes)
        .filter(([key]) => key !== schema.idField)
        .map(([key, value]) => `${findField(schema, key)?.label ?? key} → ${value}`)
      return `Update ${id}${known ? ` (${known[schema.titleField]})` : ''}: ${parts.join(', ')}`
    }
    return `Unknown action ${index + 1}`
  })
}
