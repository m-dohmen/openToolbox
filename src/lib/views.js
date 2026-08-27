// SPDX-License-Identifier: Apache-2.0
/**
 * Gespeicherte Ansichten: ein benannter Satz aus Suchbegriff, Feldfiltern und
 * Sortierung, der pro Entität im Datenblock steht und beim Laden automatisch
 * zur Verfügung steht. Die Sicht lebt im Schema als Vorschlag und in den
 * Einstellungen als das, was die Anwender daraus gemacht haben.
 *
 * Bewusst getrennt von Such- und Filterlogik: das Dropdown spiegelt die
 * Sicht in den Sitzungszustand (query/facets/filtersByEntity/sort) und
 * nichts davon geht zurück in den Datenblock. Eine Sicht ist also eher eine
 * Schablone als ein Stück UI-Zustand.
 *
 * Merge: gleicher Name = letzter Stand gewinnt. Eine Sicht, die nur in einer
 * Datei vorkommt, wird übernommen; zwei mit unterschiedlichen Werten nehmen
 * die zuletzt gespeicherte.
 */

/** Eine gültige Sicht: alle Schlüssel optional, name ist der einzige Pflichtteil. */
export function normalizeView(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = String(raw.name ?? '').trim()
  if (!name) return null
  const sort = raw.sort && typeof raw.sort === 'object'
    ? { key: String(raw.sort.key ?? ''), dir: raw.sort.dir === -1 ? -1 : 1 }
    : { key: '', dir: 1 }
  /* Filter werden roh übernommen: ihre Form kennt die App, nicht diese Datei.
     Eine fehlende Gestalt ist Sache der UI-Prüfung beim Schreiben, nicht hier. */
  const filters = raw.filters && typeof raw.filters === 'object' ? { ...raw.filters } : {}
  const query = typeof raw.query === 'string' ? raw.query : ''
  const entity = typeof raw.entity === 'string' ? raw.entity : null
  return { name, query, filters, sort, entity }
}

/** Sichten aufräumen: alles Unbrauchbare raus, Duplikate nach Name entfernen. */
export function sanitizeViews(list) {
  if (!Array.isArray(list)) return []
  const out = []
  const seen = new Set()
  for (const raw of list) {
    const v = normalizeView(raw)
    if (!v) continue
    const key = v.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out
}

/**
 * Sichten aus Schema-Vorschlag und gespeicherten Anwender-Sichten zusammenführen.
 * Die gespeicherten gewinnen: heißen sie gleich, werden die Vorschläge
 * überschrieben; sonst kommt beides nebeneinander ins Dropdown.
 */
export function mergeViewsWithDefaults(defaults, stored) {
  const byName = new Map()
  for (const v of sanitizeViews(defaults)) byName.set(v.name.toLowerCase(), v)
  for (const v of sanitizeViews(stored)) byName.set(v.name.toLowerCase(), v)
  return Array.from(byName.values())
}

/**
 * Sichten zweier Dateien zusammenführen: gleicher Name = letzter Stand
 * gewinnt, sonst bleibt alles auf seiner Seite. Die Reihenfolge folgt der
 * linken Seite; nur dort unbekannte Sichten werden am Ende angehängt.
 *
 * Konfliktfrei in dem Sinne, dass keine Sicht verloren geht: zwei Dateien mit
 * unterschiedlichen Ansichten kriegen am Ende alle. Eine Sicht, die in beiden
 * vorkommt und sich unterscheidet, kommt aus `theirs` - das ist die Datei, die
 * gerade eingelesen wird und im Abgleich als "die andere" gilt.
 */
export function mergeViews(mine, theirs) {
  const byName = new Map()
  for (const v of sanitizeViews(mine)) byName.set(v.name.toLowerCase(), v)
  for (const v of sanitizeViews(theirs)) byName.set(v.name.toLowerCase(), v)
  const order = []
  const seen = new Set()
  for (const v of sanitizeViews(mine)) {
    const k = v.name.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    order.push(byName.get(k))
  }
  for (const v of sanitizeViews(theirs)) {
    const k = v.name.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    order.push(byName.get(k))
  }
  return order
}

/**
 * Eine Sicht in laufende UI-Zustände spiegeln. Die Aufrufer entscheiden, was
 * mit den Rücksetzungen passiert; diese Funktion liefert nur die Werte.
 *
 *   setQuery, setFacet, setFiltersByEntity, setSort    Setter aus dem App-State.
 *   entityKey                                         Entität, auf die die Sicht
 *                                                     sich bezieht - der Setter
 *                                                     dafür kommt mit.
 *   switchEntity                                      Optional, wird nur bei
 *                                                     wechselnder Entität gerufen.
 */
export function applyView(view, {
  entityKey,
  setQuery,
  setFacet,
  setFiltersByEntity,
  setSort,
  switchEntity,
  fallbackSortKey,
}) {
  const targetEntity = view.entity || entityKey
  if (targetEntity !== entityKey && typeof switchEntity === 'function') {
    switchEntity(targetEntity)
  }
  if (typeof setQuery === 'function') setQuery(view.query ?? '')
  /* Facetten (Schnellfilter) und Feldfilter sind zwei Paar Schuhe: eine Sicht
     setzt beide, das Dropdown leert beim Wechsel das Gegenstück nicht mit. */
  if (typeof setFacet === 'function') {
    const next = {}
    const filters = view.filters ?? {}
    for (const [key, spec] of Object.entries(filters)) {
      if (spec && typeof spec === 'object' && 'v' in spec && !('op' in spec)) {
        next[key] = spec.v ?? null
      }
    }
    setFacet(next)
  }
  if (typeof setFiltersByEntity === 'function') {
    const filters = view.filters ?? {}
    const fieldOnly = {}
    for (const [key, spec] of Object.entries(filters)) {
      if (spec && typeof spec === 'object' && 'op' in spec) fieldOnly[key] = spec
    }
    setFiltersByEntity((all) => ({ ...all, [targetEntity]: fieldOnly }))
  }
  if (typeof setSort === 'function') {
    const s = view.sort ?? {}
    setSort({ key: s.key || fallbackSortKey, dir: s.dir === -1 ? -1 : 1 })
  }
}