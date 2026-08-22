// SPDX-License-Identifier: Apache-2.0
/**
 * Tabellensortierung für Entitätslisten. Rein funktionale Basis ohne
 * Framework-Bezug - die App hält nur den Sortierzustand der laufenden
 * Sitzung, dieser hier arbeitet auf den Datensätzen selbst und schreibt
 * nichts zurück: der eingebettete Datenblock bleibt unangetastet.
 */

import { findField, fieldValue, isBlank, resolveReferenceTitle } from './entities.js'

/** ISO-kalendertag oder ISO-Zeitstempel - beides vergleicht sich chronologisch als String. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]|$)/

/**
 * Der Dreiklang am Spaltenkopf: erster Klick aufsteigend, zweiter absteigend,
 * dritter stellt die Datenblock-Reihenfolge wieder her (Rückgabe `null`).
 * Ein Wechsel auf eine andere Spalte beginnt von vorn - die Richtung einer
 * Spalte zu merken, mit der der Nutzer zuletzt nichts mehr vorhatte, wäre
 * Zustand ohne Nutzen.
 */
export function nextSort(sort, key) {
  if (!sort || sort.key !== key) return { key, dir: 1 }
  if (sort.dir === 1) return { key, dir: -1 }
  return null
}

/**
 * Der Wert, nach dem sortiert wird - nicht zwangsläufig der gespeicherte.
 * Eine Referenz zeigt im Datensatz auf eine Id, in der Tabelle steht der
 * Titel des Ziels; wer die Ids sortierte, legte eine Ordnung, die mit dem
 * sichtbaren Inhalt nichts zu tun hat. Anhänge tragen ihren Dateinamen als
 * einzige lesbare Angabe.
 */
function sortValue(entity, entities, recordsByEntity, record, key) {
  const fieldDef = findField(entity.schema, key)
  const raw = fieldValue(entity, record, key)
  if (!fieldDef) return raw
  if (fieldDef.type === 'reference') {
    return resolveReferenceTitle(entities, recordsByEntity, fieldDef.entity, raw)
  }
  if (fieldDef.type === 'attachment') return raw?.name ?? ''
  return raw
}

/**
 * Typabhängiger Vergleich. Zahlen zählen als Zahlen - ein wortweiser Vergleich
 * stellte "10" vor "9". Daten laufen über ihre ISO-Schreibweise, die genau dann
 * chronologisch geordnet ist, wenn man sie als Zeichenkette vergleicht; bei
 * berechneten Feldern entscheidet der gelieferte Wert, nicht die Deklaration.
 * Text und Aufzählungen vergleichen sprachabhängig, Aufzählungswerte sind
 * zugleich ihre Beschriftung.
 */
function compareValues(type, x, y, locale) {
  if (type === 'number') {
    const nx = Number(x)
    const ny = Number(y)
    return (Number.isNaN(nx) ? 0 : nx) - (Number.isNaN(ny) ? 0 : ny)
  }
  if (typeof x === 'number' && typeof y === 'number') return x - y
  const xs = String(x)
  const ys = String(y)
  if (type === 'date' || (ISO_DATE.test(xs) && ISO_DATE.test(ys))) {
    return xs < ys ? -1 : xs > ys ? 1 : 0
  }
  return xs.localeCompare(ys, locale)
}

/**
 * Datensätze nach einem Spaltenkopf ordnen. Leerwerte stehen in beiden
 * Richtungen unten - ein fehlender Wert ist keine kleine Zahl und kein frühes
 * Datum, und beim Absteigen würde er sonst unaufgefordert nach oben rutschen.
 * Gleichstand bricht über die Datenblock-Reihenfolge, damit das Ergebnis
 * nicht von der Stabilitätssorge des jeweiligen Sortierers abhängt.
 */
export function sortRecords({ entity, entities, recordsByEntity, records, sort, locale }) {
  if (!sort) return [...records]
  const fieldDef = findField(entity.schema, sort.key)
  const rows = records.map((record, index) => ({
    record,
    index,
    value: sortValue(entity, entities, recordsByEntity, record, sort.key),
  }))
  const blanks = rows.filter((row) => isBlank(row.value))
  const filled = rows.filter((row) => !isBlank(row.value))
  filled.sort((a, b) => {
    const order = compareValues(fieldDef?.type, a.value, b.value, locale)
    return order !== 0 ? order * sort.dir : a.index - b.index
  })
  return [...filled, ...blanks].map((row) => row.record)
}
