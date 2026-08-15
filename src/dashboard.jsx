// SPDX-License-Identifier: Apache-2.0
/**
 * Kacheln über den Datenbestand. Deklariert wird das in domain.js als
 * DASHBOARD-Export, damit auch diese Ansicht aus dem Schema entsteht und der
 * Erbauer eines Werkzeugs nichts an der Anwendung selbst anfassen muss:
 *
 *   export const DASHBOARD = {
 *     tiles: [
 *       { type: 'stat',  measure: 'count' },
 *       { type: 'stat',  measure: 'effort', filter: (r) => r.status !== 'done' },
 *       { type: 'bar',   groupBy: 'area', measure: 'effort' },
 *       { type: 'donut', groupBy: 'status' },
 *     ],
 *   }
 *
 * Ohne Bibliothek gezeichnet: Balken sind CSS-Breiten, der Ring ist ein
 * SVG-Kreis mit stroke-dasharray. Eine Diagrammbibliothek würde die Einzeldatei
 * um ein Vielfaches dessen aufblähen, was hier tatsächlich gebraucht wird.
 *
 * Die Kacheln zeigen bewusst den vollständigen Bestand ihrer Entität, nicht die
 * gefilterte Tabellenansicht: eine Kachel kann sich auf eine andere Entität
 * beziehen als die gerade offene, und "mal gefiltert, mal nicht" wäre nicht
 * vorhersehbar.
 */
import { fieldValue, findField } from './lib/entities.js'
import { shade } from './lib/color.js'
import { Hint } from './hint.jsx'

/**
 * Farbreihe für Kategorien: Abstufungen der Akzentfarbe statt eigener Palette -
 * so bleibt das Dashboard automatisch im Farbschema des Werkzeugs.
 *
 * Die Richtung dreht mit dem Modus: auf hellem Grund läuft die Reihe von hell
 * nach dunkel, auf dunklem umgekehrt. Andernfalls verschwindet je nach Modus
 * ein Ende der Reihe im Hintergrund.
 */
function categoryColors(accent, n, dark) {
  if (n <= 1) return [accent]
  const from = dark ? -0.25 : 0.55
  const to = dark ? 0.6 : -0.3
  return Array.from({ length: n }, (_, i) => shade(accent, from + (i / (n - 1)) * (to - from)))
}

const sum = (entity, records, key) =>
  records.reduce((n, r) => n + (Number(fieldValue(entity, r, key)) || 0), 0)

/** Zahlenwert einer Kachel: Anzahl der Datensätze oder Summe eines Feldes. */
function measureValue(entity, records, measure) {
  if (!measure || measure === 'count') return records.length
  return sum(entity, records, measure)
}

function measureLabel(entity, measure, tr) {
  if (!measure || measure === 'count') return entity.schema.plural
  return findField(entity.schema, measure)?.label ?? measure
}

/** Gruppiert nach einem Feld und misst je Gruppe. Reihenfolge: Enum-Reihenfolge. */
function groupRows(entity, records, groupBy, measure) {
  const field = findField(entity.schema, groupBy)
  const keys = field?.values ?? [...new Set(records.map((r) => r[groupBy]))]
  return keys.map((key) => ({
    key,
    value: measureValue(entity, records.filter((r) => r[groupBy] === key), measure),
  }))
}

/* ── Kacheln ──────────────────────────────────────────────────── */

function StatTile({ entity, records, tile, tr }) {
  const rows = tile.filter ? records.filter(tile.filter) : records
  const value = measureValue(entity, rows, tile.measure)
  return (
    <div class="tile tile--stat">
      <p class="tile__label">{tile.label ?? measureLabel(entity, tile.measure, tr)}</p>
      <p class="tile__value">{value}</p>
      {tile.caption && <p class="tile__caption">{tile.caption}</p>}
    </div>
  )
}

function BarTile({ entity, records, tile, accent, dark, tr }) {
  const rows = groupRows(entity, tile.filter ? records.filter(tile.filter) : records, tile.groupBy, tile.measure)
  const max = Math.max(1, ...rows.map((r) => r.value))
  const colors = categoryColors(accent, rows.length, dark)

  return (
    <div class="tile">
      <p class="tile__label">
        {tile.label ?? `${measureLabel(entity, tile.measure, tr)} · ${findField(entity.schema, tile.groupBy)?.label ?? tile.groupBy}`}
      </p>
      <div class="bars">
        {rows.map((row, i) => (
          <div class="bars__row" key={row.key}>
            <span class="bars__name" title={row.key}>{row.key}</span>
            <span class="bars__track">
              <span
                class="bars__fill"
                style={`width:${(row.value / max) * 100}%;background:${colors[i]}`}
              />
            </span>
            <span class="bars__value">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutTile({ entity, records, tile, accent, dark, tr }) {
  const rows = groupRows(entity, tile.filter ? records.filter(tile.filter) : records, tile.groupBy, tile.measure)
  const total = rows.reduce((n, r) => n + r.value, 0)
  const colors = categoryColors(accent, rows.length, dark)

  // Umfang 100 macht die Segmentlängen zu Prozentwerten - dasharray braucht
  // dann keine Umrechnung. r = 100 / (2π).
  const R = 15.915
  let offset = 25 // Startpunkt oben statt rechts

  return (
    <div class="tile">
      <p class="tile__label">
        {tile.label ?? findField(entity.schema, tile.groupBy)?.label ?? tile.groupBy}
      </p>
      <div class="donut">
        <svg viewBox="0 0 42 42" role="img" aria-label={tile.label ?? tile.groupBy}>
          <circle class="donut__track" cx="21" cy="21" r={R} fill="none" stroke-width="6" />
          {total > 0 &&
            rows.map((row, i) => {
              const pct = (row.value / total) * 100
              const dash = <circle
                key={row.key}
                cx="21"
                cy="21"
                r={R}
                fill="none"
                stroke={colors[i]}
                stroke-width="6"
                stroke-dasharray={`${pct} ${100 - pct}`}
                stroke-dashoffset={offset}
              />
              offset = (offset - pct + 100) % 100
              return dash
            })}
          <text x="21" y="21.5" class="donut__total">{total}</text>
        </svg>
        <ul class="legend">
          {rows.map((row, i) => (
            <li key={row.key}>
              <span class="legend__dot" style={`background:${colors[i]}`} />
              <span class="legend__name">{row.key}</span>
              <span class="legend__value">{row.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ── Ansicht ──────────────────────────────────────────────────── */

export function DashboardView({ dashboard, entities, recordsByEntity, defaultEntityKey, accent, dark, examplePrompts, tr }) {
  return (
    <div class="dashboard">
      {examplePrompts && (
        <div class="dashboard__hint">
          <Hint show id="dashboard" tr={tr} />
        </div>
      )}
      {dashboard.tiles.map((tile, i) => {
        const key = tile.entity ?? defaultEntityKey
        const entity = entities[key]
        if (!entity) return null
        const records = recordsByEntity[key] ?? []
        const props = { entity, records, tile, accent, dark, tr }
        if (tile.type === 'bar') return <BarTile key={i} {...props} />
        if (tile.type === 'donut') return <DonutTile key={i} {...props} />
        return <StatTile key={i} {...props} />
      })}
    </div>
  )
}
