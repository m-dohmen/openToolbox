// SPDX-License-Identifier: Apache-2.0
/**
 * Globale Suche und Feldfilter über die Entitätslisten. Beides reine
 * Funktionen auf (Entity, Datensatz, Zustand); die App hält nur den Zustand
 * im Sitzungsspeicher - nichts davon geht in den Datenblock.
 *
 * Die Suche liest absichtlich ALLE Felder und nicht mehr schema.search: ein
 * Werkzeug, in dem "wo steht X" die häufigste Frage ist, darf nicht daran
 * scheitern, dass ein neues Feld vergessen wurde, in die Suche eingetragen
 * zu werden. Der schema.search-Eintrag bleibt bestehen, wird aber nicht mehr
 * gelesen (die Doku zieht mit dem nächsten Dokumentationsschritt nach).
 */

import { findField, fieldValue } from './entities.js'

/** Feldtypen, für die es einen Filter gibt. */
export const FILTERABLE_TYPES = ['text', 'enum', 'number', 'date']

/**
 * Felder, die in den Filterbereich gehören. Aufzählungen, die schon als
 * Facette laufen, bleiben dort Schnellfilter mit Stückzahlen; der Filterbereich
 * ergänzt, was Facetten nicht können: enthält-Suche, Bereiche und die
 * Mehrfachauswahl für Aufzählungen ohne eigene Facettengruppe.
 */
export const filterableFields = (schema) =>
  schema.fields.filter((f) => FILTERABLE_TYPES.includes(f.type) && !schema.facets?.includes(f.key))

const normalize = (s) => String(s ?? '').trim().toLowerCase()

/**
 * Lesbarer Wert eines Felds für die Suche. Anhänge zählen nur mit ihrem
 * Dateinamen - der base64-Inhalt wäre ein Treffer auf Zufallszeichen, kein
 * Volltext. Reference-Felder zählen mit dem aufgelösten Titel: gesucht wird,
 * was man sieht, nicht die Id dahinter.
 */
function displayValue(ctx, entity, record, field) {
  const raw = fieldValue(entity, record, field.key)
  if (field.type === 'attachment') return raw?.name ?? ''
  if (field.type === 'reference') {
    if (!raw) return ''
    const target = ctx?.entities?.[field.entity]
    if (!target) return String(raw)
    const hit = (ctx.recordsByEntity?.[field.entity] ?? []).find(
      (r) => r[target.schema.idField] === raw,
    )
    return hit ? String(hit[target.schema.titleField] ?? '') : String(raw)
  }
  return raw == null ? '' : String(raw)
}

/** Treffer, wenn IRGENDEIN Feld den Begriff enthält - case-insensitive. Die Id zählt mit. */
export function matchesSearch(entity, record, needle, ctx) {
  const q = normalize(needle)
  if (!q) return true
  const values = entity.schema.fields.map((f) => displayValue(ctx, entity, record, f))
  values.push(String(record[entity.schema.idField] ?? ''))
  return values.some((v) => v.toLowerCase().includes(q))
}

/* ── Feldfilter ───────────────────────────────────────────────── */

/** Ein Muster deckt alle Typen ab; leere Teile schränken nicht ein. */
export const emptyFilterSpec = () => ({ v: '', values: [], from: '', to: '' })

export function isActiveSpec(spec) {
  if (!spec) return false
  return (
    normalize(spec.v) !== '' ||
    (spec.values?.length ?? 0) > 0 ||
    normalize(spec.from) !== '' ||
    normalize(spec.to) !== ''
  )
}

/**
 * Alle aktiven Muster müssen gleichzeitig passen (UND); innerhalb eines
 * Musters zählt ODER - zwei gewählte Aufzählungswerte sind "das eine oder
 * das andere". Ein Datensatz ohne Wert scheidet bei jedem gesetzten Bereich
 * aus: nichts kann nicht "von" oder "bis" etwas sein. Zahlen vergleichen
 * numerisch, Daten als ISO-Strings - deren lexikalische Ordnung ist genau
 * die chronologische.
 */
export function matchesFilters(entity, record, filters) {
  for (const [key, spec] of Object.entries(filters ?? {})) {
    if (!isActiveSpec(spec)) continue
    const field = findField(entity.schema, key)
    if (!field) continue
    const value = fieldValue(entity, record, key)

    if (field.type === 'enum') {
      if (spec.values.length && !spec.values.includes(value)) return false
    } else if (field.type === 'number') {
      // Leer bleibt leer: Number('') wäre 0 und würde den Datensatz fälschlich
      // durch jeden Bereich lassen - ohne Wert gibt es keinen Bereichstreffer.
      const s = String(value ?? '').trim()
      const n = s === '' ? NaN : Number(s)
      if (normalize(spec.from) !== '' && !(n >= Number(spec.from))) return false
      if (normalize(spec.to) !== '' && !(n <= Number(spec.to))) return false
    } else if (field.type === 'date') {
      const s = String(value ?? '')
      if (normalize(spec.from) !== '' && (!s || s < spec.from)) return false
      if (normalize(spec.to) !== '' && (!s || s > spec.to)) return false
    } else if (normalize(spec.v) !== '') {
      // Text (enthält) - case-insensitive wie die globale Suche.
      if (!String(value ?? '').toLowerCase().includes(normalize(spec.v))) return false
    }
  }
  return true
}

/** Schlüssel der aktiven Muster, in Schemafeldreihenfolge - die Reihenfolge der Chips. */
export function activeFilters(schema, filters) {
  return schema.fields.filter((f) => isActiveSpec(filters?.[f.key])).map((f) => f.key)
}

/** Kompakte Chip-Beschriftung: "Effort: 10 – 15", offene Seiten als "…". */
export function filterChipLabel(schema, key, spec) {
  const field = findField(schema, key)
  const label = field?.label ?? key
  if (field?.type === 'enum') return `${label}: ${(spec.values ?? []).join(', ')}`
  if (field?.type === 'number' || field?.type === 'date') {
    const from = normalize(spec.from) !== '' ? spec.from : '…'
    const to = normalize(spec.to) !== '' ? spec.to : '…'
    return `${label}: ${from} – ${to}`
  }
  return `${label}: ${String(spec.v ?? '').trim()}`
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Text in Treffer- und Reststücke zerlegen - die Grundlage für die
 * Hervorhebung in der Tabelle. Case-insensitive; Sonderzeichen im Suchbegriff
 * sind wörtliche Zeichen, kein Muster.
 */
export function highlightParts(text, needle) {
  const source = String(text ?? '')
  const q = normalize(needle)
  if (!q) return [{ text: source, hit: false }]
  return source
    .split(new RegExp(`(${escapeRe(q)})`, 'gi'))
    .filter((p) => p !== '')
    .map((p) => ({ text: p, hit: p.toLowerCase() === q }))
}
