// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for src/lib/board.js.
 *
 * Vier Bausteine, getrennt von der UI:
 *
 *   validateBoardConfig   Prueft, ob das Schema ueberhaupt ein Board
 *                          eroeffnen darf: enum-Feld vorhanden, Werte
 *                          deklariert, Kartenfelder lesbar.
 *   groupByColumn         Nimmt eine Datensatzliste und liefert eine Karte
 *                          Spaltenname -> Datensaetze. Reihenfolge folgt der
 *                          Enum-Deklaration, leere Spalten bleiben sichtbar.
 *   moveRecordInBoard     Aendert genau das Spaltenfeld eines Datensatzes -
 *                          nichts sonst, kein Re-Render, kein Audit. Die
 *                          Andockung an Undo/Redo und das Aenderungsprotokoll
 *                          lebt in app.jsx, dort geht der Aufruf durch mutate
 *                          und damit durch den normalen Aenderungspfad.
 *   applyColumnLimit      Sagt, ob die Spalte den Hinweis-Banner braucht und
 *                          welche Karten gezeigt werden. Ausgelagert aus dem
 *                          Render-Code, damit das Verhalten hier ohne Browser
 *                          pruefbar bleibt.
 *
 * Plus ein negatives Paar: ein Aufzuehlfeld, das nicht im Schema steht, wird
 * abgelehnt; ein Datensatz ohne Spaltenwert landet in einer eigenen Reserve
 * statt in der ersten Spalte - eine Karte, die nirgends steht, waere
 * unauffindbar.
 */
import { strict as assert } from 'node:assert'
import {
  validateBoardConfig,
  groupByColumn,
  moveRecordInBoard,
  applyColumnLimit,
} from '../src/lib/board.js'
import { diffTrail } from '../src/lib/trail.js'

const schema = {
  idField: 'id',
  titleField: 'title',
  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    {
      key: 'status',
      label: 'Status',
      type: 'enum',
      values: ['open', 'in progress', 'waiting', 'done'],
    },
    { key: 'owner', label: 'Owner', type: 'text' },
    { key: 'due', label: 'Due', type: 'date' },
    { key: 'effort', label: 'Effort', type: 'number' },
  ],
}

/* ── validateBoardConfig ──────────────────────────────────────── */

assert.equal(
  validateBoardConfig(schema, null),
  null,
  'validateBoardConfig: ohne view.board fehlt die Ansicht',
)
assert.equal(
  validateBoardConfig(schema, {}),
  null,
  'validateBoardConfig: leere Deklaration ohne columnField',
)
assert.deepEqual(
  validateBoardConfig(schema, { columnField: 'status' }, { issues: true }),
  {
    cardFields: ['owner', 'due', 'effort'],
    columnField: 'status',
    limit: 50,
    issues: [],
  },
  'validateBoardConfig: Standardlimit 50, Kartenfelder ohne titleField, status vorhanden',
)

/* cardFields duerfen titleField und das Spaltenfeld selbst nicht enthalten -
   das eine steht eh auf der Karte, das andere ist die Spaltenzuordnung. */
assert.deepEqual(
  validateBoardConfig(
    schema,
    { columnField: 'status', cardFields: ['title', 'status', 'owner'] },
    { issues: true },
  ).issues,
  [
    'cardFields enthält das Titelfeld — das steht bereits auf der Karte.',
    'cardFields enthält das Spaltenfeld selbst — das ist die Spaltenzuordnung.',
  ],
  'validateBoardConfig: cardFields mit Titel/Spalte wird angemerkt',
)

/* Ein columnField, das nicht im Schema steht oder kein enum ist, faellt durch. */
assert.equal(
  validateBoardConfig(schema, { columnField: 'owner' }),
  null,
  'validateBoardConfig: Textfeld ist keine Spalte',
)
assert.equal(
  validateBoardConfig(schema, { columnField: 'unknown' }),
  null,
  'validateBoardConfig: unbekanntes Feld faellt durch',
)

/* `limit` muss eine vernuenftige Zahl sein. */
assert.deepEqual(
  validateBoardConfig(schema, { columnField: 'status', limit: 0 }, { issues: true }).issues,
  ['limit muss mindestens 1 sein.'],
  'validateBoardConfig: limit 0 wird angemerkt',
)
assert.deepEqual(
  validateBoardConfig(schema, { columnField: 'status', limit: -3 }, { issues: true }).issues,
  ['limit muss mindestens 1 sein.'],
  'validateBoardConfig: negative Grenze wird angemerkt',
)
assert.deepEqual(
  validateBoardConfig(schema, { columnField: 'status', limit: '12' }, { issues: true }).limit,
  12,
  'validateBoardConfig: limit als String wird zur Zahl',
)

/* ── groupByColumn ────────────────────────────────────────────── */

const records = [
  { id: 'A-1', title: 'a', status: 'open' },
  { id: 'A-2', title: 'b', status: 'in progress' },
  { id: 'A-3', title: 'c', status: 'open' },
  { id: 'A-4', title: 'd', status: 'done' },
  /* Datensatz ohne Wert gehoert nicht in die erste Spalte - er waere dort
     unsichtbar, aber trotzdem im Bestand. */
  { id: 'A-5', title: 'e', status: '' },
  { id: 'A-6', title: 'f', status: 'waiting' },
]

const grouped = groupByColumn(records, 'status', schema)
const columns = grouped.columns
assert.deepEqual(
  Object.keys(columns),
  ['open', 'in progress', 'waiting', 'done'],
  'groupByColumn: Reihenfolge folgt der Enum-Deklaration',
)
assert.deepEqual(
  columns['open'].map((r) => r.id),
  ['A-1', 'A-3'],
  'groupByColumn: gleicher Wert landet in derselben Spalte',
)
assert.deepEqual(columns['in progress'].map((r) => r.id), ['A-2'], 'groupByColumn: einfaches Mapping')
assert.deepEqual(columns['waiting'].map((r) => r.id), ['A-6'], 'groupByColumn: einfaches Mapping')
assert.deepEqual(columns['done'].map((r) => r.id), ['A-4'], 'groupByColumn: einfaches Mapping')
assert.equal(grouped.unassigned.length, 1, 'groupByColumn: Reserve fuer leere Werte')
assert.equal(grouped.unassigned[0].id, 'A-5', 'groupByColumn: Reserve enthaelt nur den leeren Wert')

/* Spaltenwert nicht im Schema -> ein Aufruf wirft; das ist Absicht: ohne
   gueltiges enum gibt es keine Reihenfolge und keine Validierung. */
assert.throws(
  () => groupByColumn(records, 'owner', schema),
  /columnField/,
  'groupByColumn: columnField ohne enum wirft',
)

/* ── moveRecordInBoard ────────────────────────────────────────── */

const next = moveRecordInBoard(records, 'A-1', 'status', 'in progress', schema)
const moved = next.find((r) => r.id === 'A-1')
assert.equal(moved.status, 'in progress', 'moveRecordInBoard: Spaltenwert gesetzt')
assert.equal(
  next.find((r) => r.id === 'A-1').title,
  'a',
  'moveRecordInBoard: Titel bleibt unveraendert',
)
/* Original bleibt unangetastet - die Funktion baut einen neuen Datensatz,
   weil das derselbe Pfad ist, den mutate ohnehin nimmt. */
assert.equal(records.find((r) => r.id === 'A-1').status, 'open', 'moveRecordInBoard: Original unangetastet')

/* Andockung an die Pruefung: ein Wert ausserhalb der enum-Liste wird
   abgelehnt, weil die Spalte sonst ihre Reihenfolge und ihr Aussehen
   verliert. */
assert.throws(
  () => moveRecordInBoard(records, 'A-1', 'status', 'bogus', schema),
  /notEnum|enum/,
  'moveRecordInBoard: Wert ausserhalb enum wirft',
)

/* Datensatz nicht im Bestand: kein Fehler, einfach nichts geaendert - Drag
   auf eine Karte, die zwischenzeitlich geloescht wurde, soll die Spalte
   nicht sprengen. */
const untouched = moveRecordInBoard(records, 'A-999', 'status', 'done', schema)
assert.deepEqual(
  untouched.map((r) => r.id),
  records.map((r) => r.id),
  'moveRecordInBoard: unbekannte Id ist ein No-Op',
)

/* Spalte selbst als columnField waere Unsinn: ein Aufruf ohne gueltiges
   enum wird mit einem klaren Hinweis abgewiesen, statt im Stillen irgendwo
   einen Wert reinzuschreiben. */
assert.throws(
  () => moveRecordInBoard(records, 'A-1', 'owner', 'x', schema),
  /enum-Feld/,
  'moveRecordInBoard: kein enum-Feld wirft',
)

/* Dropt man auf die Spalte, in der die Karte schon steht, faellt der Aufruf
   flach - sonst wuerde jeder No-Op im Aenderungsprotokoll landen und der
   Undo-Stapel mit leeren Eintraegen volllaufen. */
const sameColumn = moveRecordInBoard(records, 'A-1', 'status', 'open', schema)
assert.equal(
  sameColumn.find((r) => r.id === 'A-1').status,
  'open',
  'moveRecordInBoard: Drop auf gleiche Spalte aendert nichts',
)
assert.deepEqual(
  sameColumn.map((r) => ({ id: r.id, status: r.status })),
  records.map((r) => ({ id: r.id, status: r.status })),
  'moveRecordInBoard: Drop auf gleiche Spalte laesst den Rest unangetastet',
)

/* ── applyColumnLimit ─────────────────────────────────────────── */

assert.deepEqual(
  applyColumnLimit([], 10),
  { exceeded: false, shown: [] },
  'applyColumnLimit: leere Spalte, kein Banner',
)
assert.deepEqual(
  applyColumnLimit([{ id: 'A-1' }, { id: 'A-2' }], 10),
  { exceeded: false, shown: [{ id: 'A-1' }, { id: 'A-2' }] },
  'applyColumnLimit: unter dem Limit, vollstaendig',
)
const heavy = Array.from({ length: 60 }, (_, i) => ({ id: 'A-' + i }))
const limited = applyColumnLimit(heavy, 50)
assert.equal(limited.exceeded, true, 'applyColumnLimit: 60 > 50, Banner erscheint')
assert.equal(limited.shown.length, 50, 'applyColumnLimit: erste 50 Karten rendern')
assert.equal(limited.shown[0].id, 'A-0', 'applyColumnLimit: Reihenfolge bleibt')
assert.equal(limited.shown[49].id, 'A-49', 'applyColumnLimit: Schnitt bei 50')

/* Ein Limit, das selbst kaputt ist (0, negativ), wird auf den Standard
   zurueckgesetzt - dieselbe Haltung wie validateBoardConfig. */
const fallback = applyColumnLimit(heavy, 0)
assert.equal(fallback.shown.length, 50, 'applyColumnLimit: 0 faellt auf 50 zurueck')
const negative = applyColumnLimit(heavy, -3)
assert.equal(negative.shown.length, 50, 'applyColumnLimit: negativ faellt auf 50 zurueck')

/* ── Andockung an Undo/Redo und Aenderungsprotokoll ─────────────
 *
 * moveRecordInBoard allein fuellt weder den Undo-Stapel noch das
 * Aenderungsprotokoll. Beides lebt in app.jsx (mutate, recordChange), und
 * diese Suite prueft nur die Vorbedingung: das Ergebnis ist genau die Form,
 * die diffTrail als Update-Eintrag erkennt. Wer spaeter den Pfad von mutate
 * auf einen Direkt-Setter umstellt, ohne diffTrail zu pruefen, schreibt
 * leise Bewegungen ohne Audit-Eintrag - dieser Test faengt das ab. */
const entities = { records: { schema } }
const before = records
const after = moveRecordInBoard(before, 'A-1', 'status', 'done', schema)
assert.notEqual(after, before, 'moveRecordInBoard liefert eine neue Liste, nicht dieselbe')
const diff = diffTrail(entities, ['records'], { records: before }, { records: after })
const update = diff.changes.find((c) => c.id === 'A-1' && c.field === 'Status')
assert.ok(update, 'diffTrail: Aenderungsprotokoll sieht die Bewegung')
assert.equal(update.before, 'open', 'diffTrail: alter Wert im Eintrag')
assert.equal(update.after, 'done', 'diffTrail: neuer Wert im Eintrag')
assert.equal(update.op, 'updated', 'diffTrail: op ist updated, nicht create oder delete')

/* Eine No-Op-Bewegung (gleiche Spalte) erzeugt keinen diff-Eintrag - sonst
   wuerde das Protokoll bei jedem missglueckten Drag einen Eintrag bekommen. */
const noop = moveRecordInBoard(before, 'A-1', 'status', 'open', schema)
const noopDiff = diffTrail(entities, ['records'], { records: before }, { records: noop })
assert.equal(noopDiff.changes.length, 0, 'diffTrail: No-Op-Bewegung erzeugt keinen Eintrag')

console.log('OK board')