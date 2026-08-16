// SPDX-License-Identifier: Apache-2.0
/**
 * Was sich seit dem letzten Speichern an den Datensätzen geändert hat.
 *
 * Das Änderungsprotokoll hält bisher je Speichervorgang einen Freitext fest.
 * Die Frage in einem Audit lautet aber nie „was hast du am Vierzehnten
 * gemacht", sondern **„was genau ist an A-1041 zwischen 1.2 und 1.4
 * passiert"**. Dafür braucht es die Änderungen pro Feld, und die kann man
 * ableiten statt eintippen zu lassen: beim Speichern wird der aktuelle Stand
 * gegen den zuletzt gespeicherten gehalten.
 *
 * Abgeleitet statt erfasst ist der Punkt. Ein Protokoll, das von der Disziplin
 * des Schreibenden abhängt, ist in genau dem Moment lückenhaft, in dem es
 * gebraucht wird.
 */

import { writableFields } from './entities.js'

/* Obergrenze je Eintrag. Ein CSV-Import über 4000 Zeilen soll die Datei nicht
   um ein Vielfaches der Daten aufblähen - dann steht dort, wie viel nicht
   aufgeführt ist, statt dass es still fehlt. */
export const MAX_CHANGES = 200

const show = (v) => (v === undefined || v === null ? '' : String(v))

/**
 * Vergleicht zwei Datensatzbestände. Liefert eine flache Liste von Einträgen:
 *
 *   { op: 'created' | 'updated' | 'deleted', entity, id, title, field?, before?, after? }
 *
 * Ein geänderter Datensatz erzeugt einen Eintrag je geändertem Feld - das ist
 * die Auflösung, in der später gefragt wird.
 */
export function diffTrail(entities, entityKeys, before, after) {
  const out = []
  let dropped = 0

  for (const key of entityKeys) {
    const schema = entities[key].schema
    const idField = schema.idField
    const titleField = schema.titleField
    const fields = writableFields(schema)

    const old = new Map((before[key] ?? []).map((r) => [String(r[idField]), r]))
    const now = new Map((after[key] ?? []).map((r) => [String(r[idField]), r]))

    const push = (item) => {
      if (out.length < MAX_CHANGES) out.push(item)
      else dropped++
    }

    for (const [id, record] of now) {
      const previous = old.get(id)
      if (!previous) {
        push({ op: 'created', entity: key, id, title: show(record[titleField]) })
        continue
      }
      for (const f of fields) {
        if (show(previous[f.key]) === show(record[f.key])) continue
        push({
          op: 'updated',
          entity: key,
          id,
          title: show(record[titleField]),
          field: f.label,
          before: show(previous[f.key]),
          after: show(record[f.key]),
        })
      }
    }

    for (const [id, record] of old) {
      if (!now.has(id)) push({ op: 'deleted', entity: key, id, title: show(record[titleField]) })
    }
  }

  return { changes: out, dropped }
}

/** Alle Einträge des Protokolls, die einen bestimmten Datensatz betreffen. */
export function trailFor(log, id) {
  const hits = []
  log.forEach((entry, index) => {
    for (const change of entry.changes ?? []) {
      if (String(change.id) === String(id)) hits.push({ ...change, at: entry.at, version: entry.version, index })
    }
  })
  return hits.reverse()
}
