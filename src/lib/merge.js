// SPDX-License-Identifier: Apache-2.0
/**
 * Zwei Stände derselben Datei zusammenführen.
 *
 * Das schließt die Lücke, die diese Bauform sonst offen lässt: Wer eine Datei
 * an fünf Abteilungen schickt, bekommt fünf Dateien zurück. Bis hierher hieß
 * das abtippen. Der Abgleich vergleicht stattdessen Datensatz für Datensatz
 * und lässt einzeln entscheiden, was übernommen wird.
 *
 * Möglich ist das nur, weil beide Seiten dasselbe Schema und dieselben
 * Identifikatoren haben - der Abgleich ist ausdrücklich für zwei Kopien
 * *derselben* Datei gedacht, nicht für zwei beliebige Werkzeuge. Passt das
 * Schema nicht, wird das gesagt statt geraten.
 */

import { writableFields } from './entities.js'

/** Den Datenblock aus dem Quelltext einer anderen openToolbox-Datei ziehen. */
export function extractPayload(html) {
  const match = html.match(/<script\b[^>]*id="sb-payload"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) throw new Error('No openToolbox data block found in this file.')
  const raw = match[1].trim()
  if (!raw || raw === 'null') throw new Error('That file has no records in it yet.')
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('The data block in that file is damaged.')
  }
}

/**
 * Vergleicht einen Datensatzbestand mit einem eingelesenen. Liefert je Entität
 * vier Gruppen. `removed` sind Datensätze, die es hier gibt und dort nicht -
 * per Voreinstellung passiert damit nichts, siehe Kommentar in merge.jsx.
 */
export function diffEntity(entity, mine, theirs) {
  const idField = entity.schema.idField
  const byId = (rows) => new Map(rows.map((r) => [String(r[idField]), r]))
  const here = byId(mine)
  const there = byId(theirs)
  const fields = writableFields(entity.schema)

  const added = []
  const changed = []
  const removed = []
  let same = 0

  for (const [id, record] of there) {
    const mineRecord = here.get(id)
    if (!mineRecord) {
      added.push({ id, record })
      continue
    }
    const diffs = fields
      .filter((f) => normalize(mineRecord[f.key]) !== normalize(record[f.key]))
      .map((f) => ({ key: f.key, label: f.label, before: mineRecord[f.key], after: record[f.key] }))
    if (diffs.length) changed.push({ id, record, mine: mineRecord, diffs })
    else same++
  }
  for (const [id, record] of here) {
    if (!there.has(id)) removed.push({ id, record })
  }

  return { added, changed, removed, same }
}

/* Zahl 3 und Text "3" sind derselbe Wert, wenn einer davon aus einem
   CSV-Import stammt. Sie als Unterschied zu melden waere Rauschen. */
const normalize = (v) => (v === undefined || v === null ? '' : String(v))

/** Alle Entitäten auf einmal. Unbekannte Schlüssel im Gegenüber werden benannt. */
export function diffAll(entities, entityKeys, mineByEntity, theirsByEntity) {
  const byEntity = {}
  const notes = []
  for (const key of entityKeys) {
    byEntity[key] = diffEntity(entities[key], mineByEntity[key] ?? [], theirsByEntity[key] ?? [])
  }
  for (const key of Object.keys(theirsByEntity)) {
    if (!entityKeys.includes(key)) notes.push(key)
  }
  return { byEntity, notes }
}

/**
 * Wendet die Auswahl an. `picks` ist `{ [entityKey]: { added: Set, changed: Set,
 * removed: Set } }` - jeweils die Ids, die übernommen werden sollen. Was nicht
 * ausgewählt ist, bleibt wie es hier ist.
 */
export function applyMerge(entities, entityKeys, mineByEntity, diff, picks) {
  const next = {}
  const counts = { added: 0, changed: 0, removed: 0 }

  for (const key of entityKeys) {
    const idField = entities[key].schema.idField
    const chosen = picks[key] ?? {}
    const group = diff.byEntity[key]

    const drop = new Set(chosen.removed ?? [])
    const replace = new Map(
      group.changed.filter((c) => chosen.changed?.has(c.id)).map((c) => [c.id, c.record]),
    )

    next[key] = (mineByEntity[key] ?? [])
      .filter((r) => !drop.has(String(r[idField])))
      .map((r) => {
        const id = String(r[idField])
        if (!replace.has(id)) return r
        counts.changed++
        return { ...replace.get(id) }
      })
    counts.removed += drop.size

    for (const item of group.added) {
      if (!chosen.added?.has(item.id)) continue
      next[key].push({ ...item.record })
      counts.added++
    }
  }

  return { next, counts }
}
