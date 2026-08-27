// SPDX-License-Identifier: Apache-2.0
/**
 * Spaltenansicht pro Entitaet. Eine optionale `view.board`-Deklaration im
 * Schema schaltet sie frei: ein benanntes enum-Feld wird zur Spalte, eine
 * Handvoll anderer Felder landen auf der Karte. Ohne diese Erklaerung gibt
 * es die Ansicht gar nicht - genau wie Dashboard und Wizard.
 *
 * Drei Aufgaben, sauber getrennt:
 *
 *   validateBoardConfig   Schema pruefen, Spalten- und Kartenfelder
 *                          aufloesen. Liefert eine normalisierte Form oder
 *                          null - die App blendet den Reiter dann nicht ein.
 *   groupByColumn         Datensaetze auf die Spalten verteilen. Reihenfolge
 *                          folgt der enum-Deklaration; leere Werte landen in
 *                          einer Reserve, nicht in der ersten Spalte.
 *   moveRecordInBoard     Das Spaltenfeld eines Datensatzes aendern -
 *                          minimal, ohne UI, ohne Audit. Die Andockung an
 *                          Undo/Redo und das Aenderungsprotokoll uebernimmt
 *                          die App ueber `mutate`, damit ein Drag&Drop genau
 *                          wie ein Formular-Klick laeuft.
 */

import { coerceField, findField } from './entities.js'

/* ── Konfiguration ────────────────────────────────────────────── */

/**
 * Liest die `view.board`-Deklaration, normalisiert sie und liefert sie zurueck,
 * oder null wenn keine Ansicht freigeschaltet werden soll. Mit
 * `{ issues: true }` werden Beanstandungen in einem `issues`-Feld mitgeliefert,
 * damit die App sie neben den gueltigen Spalten anzeigt, statt sie still zu
 * schlucken.
 *
 *   { columnField, cardFields, limit, issues }
 *
 * Standardlimit 50 - wer 200+ Karten in einer Spalte hat, soll die Last sehen,
 * nicht die Anwendung stottern. Kartenfelder sind alles ausser dem Titel und
 * dem Spaltenfeld selbst; bis drei davon, in der Reihenfolge des Schemas.
 */
export function validateBoardConfig(schema, raw, options = {}) {
  if (!raw || typeof raw !== 'object') return null
  const issues = []
  const columnField = String(raw.columnField ?? '').trim()
  const columnDef = columnField ? findField(schema, columnField) : null
  if (!columnDef || columnDef.type !== 'enum') return null

  /* Kartenfelder: was im Schema steht, abzueglich Titel und Spalte. Reihenfolge
     folgt dem Schema, damit der Erbauer eines Werkzeugs nicht noch eine
     eigene Sortierung pflegen muss. */
  const skip = new Set([schema.titleField, columnField])
  const declared = Array.isArray(raw.cardFields) ? raw.cardFields.filter((k) => typeof k === 'string') : null
  const cardFields = declared
    ? declared.filter((k) => findField(schema, k) && !skip.has(k)).slice(0, 3)
    : schema.fields
        .filter((f) => f.type !== 'computed' && !skip.has(f.key) && f.type !== 'attachment')
        .map((f) => f.key)
        .slice(0, 3)
  if (declared) {
    for (const key of declared) {
      if (!findField(schema, key)) {
        issues.push(`cardFields nennt kein vorhandenes Feld („${key}“).`)
        continue
      }
      if (key === schema.titleField) issues.push('cardFields enthält das Titelfeld — das steht bereits auf der Karte.')
      if (key === columnField) issues.push('cardFields enthält das Spaltenfeld selbst — das ist die Spaltenzuordnung.')
    }
  }

  /* Limit als Zahl; 0 und negativ sind Quatsch, der Hinweis-Banner haengt
     dann an jeder Spalte. */
  let limit = Number(raw.limit)
  if (!Number.isFinite(limit) || limit <= 0) {
    if (raw.limit !== undefined) issues.push('limit muss mindestens 1 sein.')
    limit = 50
  }

  return options.issues ? { columnField, cardFields, limit, issues } : { columnField, cardFields, limit }
}

/* ── Verteilung ───────────────────────────────────────────────── */

/**
 * Nimmt die sichtbaren Datensaetze und verteilt sie auf die Spalten. Die
 * Reihenfolge folgt der enum-Deklaration, damit `open` immer links steht,
 * egal in welcher Reihenfolge die Datensaetze im Datenblock liegen.
 *
 * Liefert `{ columns, unassigned }`: `columns` enthaelt nur die enum-Werte in
 * der deklarierten Reihenfolge, `unassigned` ist die Reserve fuer leere oder
 * ungueltige Werte - eine Karte, die in keiner Spalte steht, waere sonst
 * unauffindbar, gleichzeitig soll die Reserve nicht als "erste Spalte"
 * durchgehen.
 */
export function groupByColumn(records, columnField, schema) {
  const def = findField(schema, columnField)
  if (!def || def.type !== 'enum') {
    throw new Error(`groupByColumn: columnField "${columnField}" ist kein enum-Feld im Schema.`)
  }
  const columns = {}
  for (const value of def.values) columns[value] = []
  const unassigned = []
  for (const record of records) {
    const value = record[columnField]
    if (value && Object.prototype.hasOwnProperty.call(columns, value)) {
      columns[value].push(record)
    } else {
      unassigned.push(record)
    }
  }
  return { columns, unassigned }
}

/* ── Verschieben ──────────────────────────────────────────────── */

/**
 * Schema-bewusste Variante: prueft den enum-Wert gegen die Schema-Definition
 * und wirft bei einem ungueltigen Wert. Das ist die Form, die die App
 * tatsaechlich aufruft - Drag&Drop soll nichts an der Schreiboberflaeche
 * vorbeischleusen, die das Formular nicht auch durchlaesst.
 *
 * Unbekannte Id ist ein No-Op: wer eine Karte zieht, die zwischenzeitlich
 * geloescht wurde, soll die Spalte nicht sprengen.
 */
export function moveRecordInBoard(records, recordId, columnField, targetValue, schema) {
  const columnDef = findField(schema, columnField)
  if (!columnDef || columnDef.type !== 'enum') {
    throw new Error(`moveRecordInBoard: columnField "${columnField}" ist kein enum-Feld im Schema.`)
  }
  /* coerceField ist die einzige Stelle, die enum-Werte gegen die Liste
     prueft - bewusst wiederverwendet, damit Formular, CSV-Import und
     KI-Vorschlaege dieselbe Form haben. */
  const probe = coerceField(schema, columnField, targetValue)
  if (!probe.ok) {
    throw new Error(`enum-Wert "${targetValue}" nicht erlaubt: ${probe.code}`)
  }
  const idKey = schema.idField
  const out = records.slice()
  const index = out.findIndex((r) => String(r[idKey]) === String(recordId))
  if (index < 0) return out
  const current = out[index]
  if (current[columnField] === probe.value) return out
  out[index] = { ...current, [columnField]: probe.value }
  return out
}

/* ── Spalten-Limit ────────────────────────────────────────────── */

/**
 * Beantwortet zwei Fragen auf einmal: ueberschreitet die Spalte das Limit,
 * und wenn ja, wie viele Karten sollen tatsaechlich gerendert werden?
 *
 * Liefert `{ exceeded, shown }`:
 *
 *   exceeded   true, wenn die Liste laenger ist als das erlaubte Limit. Nur
 *              dann erscheint der Hinweis-Banner, der das Limit und die
 *              tatsaechliche Zahl nennt.
 *   shown      Liste, die gerendert wird - bei Ueberschreitung die ersten
 *              `limit` Eintraege, sonst unveraendert.
 *
 * Bei einem Limit von 0 oder negativem Wert wird das Default-Limit (50)
 * angenommen - die Validierung in `validateBoardConfig` hat den Wert bereits
 * normalisiert, hier nur ein Sicherheitsnetz.
 */
export function applyColumnLimit(records, limit) {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 50
  const exceeded = records.length > safeLimit
  return {
    exceeded,
    shown: exceeded ? records.slice(0, safeLimit) : records,
  }
}