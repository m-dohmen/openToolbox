// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for src/lib/views.js and the views branch in src/lib/merge.js.
 *
 * Das Augenmerk liegt auf dem Merge: zwei Akzeptanzkriterien aus OPEN-102 sind
 * hier verankert ("positiver Fall" und "negativer Fall mit Konflikt"), dazu
 * die übliche Robustheit gegen leere/kaputte Eingaben, die andere Module
 * auch aushalten müssen. Reine UI-Aspekte (Dropdown, Settings-Editor) laufen
 * indirekt mit smoke.mjs, das die laufende App anfasst.
 */
import { strict as assert } from 'node:assert'
import {
  normalizeView,
  sanitizeViews,
  mergeViewsWithDefaults,
  mergeViews,
  applyView,
} from '../src/lib/views.js'
import { applyMerge } from '../src/lib/merge.js'

/* ── normalizeView ─────────────────────────────────────────────── */

assert.equal(normalizeView(null), null, 'normalizeView: null wird abgewiesen')
assert.equal(normalizeView({}), null, 'normalizeView: ohne name wird abgewiesen')
assert.equal(normalizeView({ name: '   ' }), null, 'normalizeView: whitespace-Name ist ungültig')

const base = normalizeView({
  name: 'Open of mine',
  query: 'audit',
  filters: { owner: { v: 'A. Reinke', op: 'contains' } },
  sort: { key: 'due', dir: -1 },
})
assert.equal(base.name, 'Open of mine')
assert.equal(base.query, 'audit')
assert.equal(base.filters.owner.v, 'A. Reinke')
assert.equal(base.sort.dir, -1)

/* Unscharfe Sort-Richtung wird auf 1 normalisiert. */
assert.equal(
  normalizeView({ name: 'x', sort: { key: 'due', dir: 7 } }).sort.dir,
  1,
  'normalizeView: unbekannte Sort-Richtung fällt auf 1',
)

/* ── sanitizeViews ─────────────────────────────────────────────── */

assert.deepEqual(
  sanitizeViews([{ name: 'a' }, null, { name: 'a' }, { name: '' }, { name: 'b' }]).map((v) => v.name),
  ['a', 'b'],
  'sanitizeViews: ungültige Einträge fallen raus, Duplikate werden reduziert',
)

/* ── mergeViewsWithDefaults ────────────────────────────────────── */

/** Positiver Fall: Vorschlag und gespeicherte Sicht ergänzen sich ohne
    Namenskonflikt - die effektive Liste enthält beide. */
assert.deepEqual(
  mergeViewsWithDefaults(
    [{ name: 'Open of mine', sort: { key: 'due', dir: 1 } }],
    [{ name: 'Overdue', sort: { key: 'due', dir: -1 } }],
  ).map((v) => v.name),
  ['Open of mine', 'Overdue'],
  'mergeViewsWithDefaults: positive Vereinigung',
)

/** Negativer Fall: gleicher Name = gespeicherte Sicht gewinnt. */
const collision = mergeViewsWithDefaults(
  [{ name: 'Open of mine', sort: { key: 'due', dir: 1 } }],
  [{ name: 'Open of mine', sort: { key: 'title', dir: -1 } }],
)
assert.equal(collision.length, 1, 'Kollision: nur eine Sicht in der Liste')
assert.equal(collision[0].sort.key, 'title', 'Kollision: gespeicherte Variante gewinnt')
assert.equal(collision[0].sort.dir, -1, 'Kollision: Richtung der gespeicherten Variante')

/* ── mergeViews (zwei Dateien, gleicher Schlüssel) ─────────────── */

/** Konfliktfreier Fall: zwei Dateien mit unterschiedlichen Sichten vereinigen
    sich, ohne dass etwas verloren geht. */
assert.deepEqual(
  mergeViews(
    [{ name: 'A' }],
    [{ name: 'B' }],
  ).map((v) => v.name),
  ['A', 'B'],
  'mergeViews: beide Seiten kommen vor',
)

/** Konfliktfall: gleicher Name, unterschiedliche Werte - die "andere" Seite
    gewinnt, weil sie im Abgleich als letzter Stand gilt. */
const merged = mergeViews(
  [{ name: 'Q3', query: 'audit', sort: { key: 'due', dir: 1 } }],
  [{ name: 'Q3', query: 'review', sort: { key: 'title', dir: -1 } }],
)
assert.equal(merged.length, 1)
assert.equal(merged[0].query, 'review', 'mergeViews: theirs gewinnt bei Konflikt')
assert.equal(merged[0].sort.key, 'title')

/** Reihenfolge: linke Seite zuerst, rechte Seite nur dort neu, wo links
    kein Name steht. */
const order = mergeViews(
  [{ name: 'A' }, { name: 'B' }],
  [{ name: 'B' }, { name: 'C' }],
).map((v) => v.name)
assert.deepEqual(order, ['A', 'B', 'C'], 'mergeViews: Reihenfolge A,B,C')

/* ── applyMerge mit Sichten ────────────────────────────────────── */

const entities = {
  records: {
    schema: {
      idField: 'id',
      list: ['title', 'status'],
      fields: [{ key: 'title', type: 'text', label: 'Title' }],
      rules: [],
      facets: [],
    },
  },
}
const before = [{ id: 'A-1', title: 'Old', status: 'open' }]
const after = [{ id: 'A-1', title: 'New', status: 'open' }]
const diff = { byEntity: { records: { added: [], changed: [{ id: 'A-1', record: after[0] }], removed: [] } } }

/** Standarddatensätze und Sichten gemeinsam mergen. */
const result = applyMerge(
  entities,
  ['records'],
  { records: before },
  diff,
  { records: { added: new Set(), changed: new Set(['A-1']), removed: new Set() } },
  { views: { mine: [{ name: 'Mine' }], theirs: [{ name: 'Theirs' }, { name: 'Mine' }] } },
)
assert.equal(result.next.records[0].title, 'New', 'Datensatz wurde übernommen')
assert.deepEqual(
  result.nextViews.map((v) => v.name),
  ['Mine', 'Theirs'],
  'Sichten: theirs gewinnt bei Namensgleichheit',
)

/** Ohne views-Argument läuft applyMerge wie bisher. */
const withoutViews = applyMerge(entities, ['records'], { records: before }, diff, {
  records: { added: new Set(), changed: new Set(['A-1']), removed: new Set() },
})
assert.equal(withoutViews.nextViews, null, 'applyMerge: ohne views-Argument bleibt nextViews null')

/* ── applyView: Sicht in UI-Zustände spiegeln ───────────────────── */

const calls = { query: null, facet: null, filters: null, sort: null, switchedTo: null }
const view = {
  name: 'Open of mine',
  query: 'audit',
  filters: {
    owner: { v: 'A. Reinke', op: 'contains' },
    /* Wert ohne "op" landet in der Facette (Schnellfilter). */
    status: { v: 'open' },
  },
  sort: { key: 'due', dir: -1 },
}
applyView(view, {
  entityKey: 'records',
  setQuery: (q) => (calls.query = q),
  setFacet: (f) => (calls.facet = f),
  setFiltersByEntity: (fn) => (calls.filters = fn({ records: {} })),
  setSort: (s) => (calls.sort = s),
  fallbackSortKey: 'title',
})
assert.equal(calls.query, 'audit', 'applyView: Suchbegriff gesetzt')
assert.deepEqual(calls.facet, { status: 'open' }, 'applyView: Facette aus dem Wert ohne op')
assert.deepEqual(calls.filters.records, { owner: { v: 'A. Reinke', op: 'contains' } })
assert.equal(calls.sort.dir, -1, 'applyView: absteigende Richtung erhalten')

console.log('OK views')