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
 *     charts: [
 *       { type: 'chart', kind: 'bar',   groupBy: 'area', measure: 'effort' },
 *       { type: 'chart', kind: 'donut', groupBy: 'status' },
 *       { type: 'chart', kind: 'line',  dateField: 'due', aggregate: 'count' },
 *     ],
 *   }
 *
 * Der `chart`-Block ist die neue einheitliche Schreibweise (OPEN-103) und
 * unterstuetzt drei kinds: 'bar', 'donut' (wie die alten Kacheln, jetzt als
 * Inline-SVG) und 'line' (eine Zeitreihe ueber dateField je Monat, aggregate
 * 'count' oder 'sum' mit 'field'). Inline-SVG, keine Bibliothek, keine
 * externe Quelle - ein Diagramm rendert auch ohne Netz.
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
import { groupByDueDate, hasDueDates } from './lib/dueDate.js'
import { formatMetricValue, metricValue, validateMetrics } from './lib/metrics.js'
import {
  prepareBarRows,
  prepareDonutRows,
  prepareLinePoints,
  niceScale,
  linePath,
  validateChart,
} from './lib/charts.js'
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

/** Legacy: Gruppierung hiess hier frueher groupRows. Die Arbeit liegt jetzt in
   lib/charts.js (prepareBarRows / prepareDonutRows). Belassen, falls eine
   aeltere Importstelle noch drauf verweist - der Aufruf wuerde sonst
   scheitern, was hier niemand mehr tut. */
function groupRows(entity, records, groupBy, measure) {
  const field = findField(entity.schema, groupBy)
  const keys = field?.values ?? [...new Set(records.map((r) => r[groupBy]))]
  return keys.map((key) => ({
    key,
    value: measureValue(entity, records.filter((r) => r[groupBy] === key), measure),
  }))
}
void groupRows

/**
 * Kennzahl-Kachel aus `schema.metrics` - count, sum oder avg, gerechnet über
 * den vollen Bestand der eigenen Entität. Klick springt zur Liste dieser
 * Entität (V1 ungefiltert); die Tastatur bekommt dieselbe Aktion, ein
 * role="button" ohne Tastenpfad wäre nur die halbe Kachel.
 */
function MetricTile({ entityKey, entity, records, metric, locale, onShowList }) {
  const value = formatMetricValue(
    metricValue(entity, records, metric),
    locale,
    metric.op === 'avg' ? 2 : undefined,
  )
  const open = () => onShowList(entityKey)
  return (
    <div
      class="tile tile--stat tile--metric"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
    >
      <p class="tile__label">{metric.label}</p>
      <p class="tile__value">{value}</p>
      {metric.caption && <p class="tile__caption">{metric.caption}</p>}
    </div>
  )
}

/**
 * Verworfene Deklarationen werden benannt, nicht still übergangen - als eigene
 * Kachel zwischen den gültigen, damit sie im Raster auffallen statt in der
 * Konsole zu verblassen.
 */
function MetricIssueTile({ entity, issues, tr }) {
  if (!issues.length) return null
  return (
    <div class="tile tile--metric-issue">
      <p class="tile__label">{tr('dashboard.metrics.rejected', entity.schema.plural)}</p>
      <ul class="metric-issues">
        {issues.map((issue, i) => (
          <li key={i}>{tr('dashboard.metrics.' + issue.code, ...issue.params)}</li>
        ))}
      </ul>
    </div>
  )
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
  const rows = prepareBarRows(
    entity,
    tile.filter ? records.filter(tile.filter) : records,
    tile.groupBy,
    tile.measure,
  ).rows
  const scale = niceScale(rows.reduce((m, r) => (r.value > m ? r.value : m), 0))
  const colors = categoryColors(accent, Math.max(rows.length, 1), dark)
  const W = 320
  const trackX = 110
  const trackW = 160
  const rowH = 22
  const padY = 8
  const height = rows.length * rowH + padY * 2 + (scale.ticks.length > 1 ? 14 : 0)

  return (
    <div class="tile">
      <p class="tile__label">
        {tile.label ?? `${measureLabel(entity, tile.measure, tr)} · ${findField(entity.schema, tile.groupBy)?.label ?? tile.groupBy}`}
      </p>
      {rows.length === 0 ? (
        <p class="chart-empty">{tr('dashboard.chart.empty')}</p>
      ) : (
        <svg
          class="bars"
          viewBox={`0 0 ${W} ${height}`}
          role="img"
          aria-label={tile.label ?? tile.groupBy}
          preserveAspectRatio="xMinYMin meet"
        >
          {rows.map((row, i) => {
            const ratio = scale.max ? row.value / scale.max : 0
            const w = ratio * trackW
            const y = padY + i * rowH
            return (
              <g key={row.key ?? i} class="bars__row">
                <title>{`${row.label}: ${row.value}`}</title>
                <text class="bars__name" x={trackX - 8} y={y + rowH / 2 + 4} text-anchor="end">{row.label}</text>
                <rect class="bars__track" x={trackX} y={y + 4} width={trackW} height={rowH - 8} rx="2" />
                <rect class="bars__fill" x={trackX} y={y + 4} width={Math.max(w, row.value > 0 ? 1.5 : 0)} height={rowH - 8} rx="2" fill={colors[i]} />
                <text class="bars__value" x={trackX + trackW + 8} y={y + rowH / 2 + 4}>{row.value}</text>
              </g>
            )
          })}
          {scale.ticks.length > 1 && (
            <g class="bars__axis" transform={`translate(0, ${height - 14})`}>
              {scale.ticks.map((t) => {
                const x = trackX + (t / scale.max) * trackW
                return (
                  <g key={t}>
                    <line x1={x} y1={0} x2={x} y2={4} stroke="currentColor" />
                    <text x={x} y={12} text-anchor="middle">{t}</text>
                  </g>
                )
              })}
            </g>
          )}
        </svg>
      )}
    </div>
  )
}

function DonutTile({ entity, records, tile, accent, dark, tr }) {
  const { rows, total } = prepareDonutRows(
    entity,
    tile.filter ? records.filter(tile.filter) : records,
    tile.groupBy,
    tile.measure,
  )
  const colors = categoryColors(accent, Math.max(rows.length, 1), dark)

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
          <title>{`${total} ${entity.schema.plural}`}</title>
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
              <span class="legend__name">{row.label}</span>
              <span class="legend__value">{row.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * Zeitreihe ueber ein Datumsfeld. aggregation 'count' zaehlt die Datensaetze
 * je Monat, 'sum(field)' summiert ein numerisches Feld. Fehlende Monate
 * bleiben als Luecke sichtbar - die Linie springt nicht ueber sie hinweg,
 * ein Strichplatzhalter wuerde einen Monat mit Wert nur suggerieren.
 *
 * X-Achse: bis zu sechs Monatsmarkierungen, gleichmaessig verteilt - bei
 * vielen Monaten wuerde eine Beschriftung jedes Monats die Skala unlesbar
 * machen. Y-Achse: drei Ticks (0, Mitte, Maximum), derselbe nice-Scaler wie
 * der Balken.
 */
function LineTile({ entity, records, tile, accent, dark, tr }) {
  const { points, months, max } = prepareLinePoints(
    entity,
    tile.filter ? records.filter(tile.filter) : records,
    tile.dateField,
    tile.aggregate,
    tile.field,
  )
  const scale = niceScale(max)
  const W = 320
  const H = 160
  const padL = 28
  const padR = 8
  const padT = 8
  const padB = 22
  const x = (key) => {
    if (months.length <= 1) return padL + (W - padL - padR) / 2
    const i = months.indexOf(key)
    return padL + (i / (months.length - 1)) * (W - padL - padR)
  }
  const y = (value) => padT + (1 - value / scale.max) * (H - padT - padB)
  const path = linePath(points, x, y)
  const xTickEvery = Math.max(1, Math.ceil(months.length / 6))

  return (
    <div class="tile">
      <p class="tile__label">{tile.label ?? defaultLineLabel(entity, tile, tr)}</p>
      {points.length === 0 ? (
        <p class="chart-empty">{tr('dashboard.chart.empty')}</p>
      ) : (
        <svg
          class="line-chart"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={tile.label ?? `${tile.dateField} ${tile.aggregate}`}
          preserveAspectRatio="xMinYMin meet"
        >
          <title>{lineTitle(entity, tile, points, max, tr)}</title>
          {scale.ticks.map((t) => {
            const yy = y(t)
            return <line key={t} class="line-chart__grid" x1={padL} y1={yy} x2={W - padR} y2={yy} />
          })}
          {scale.ticks.map((t) => {
            const yy = y(t)
            return (
              <text key={'ty-' + t} class="line-chart__tick" x={padL - 6} y={yy + 4} text-anchor="end">{t}</text>
            )
          })}
          {path && <path class="line-chart__line" d={path} fill="none" stroke={accent} stroke-width="1.5" />}
          {points.map((p) =>
            p.value === null || p.value === undefined || Number.isNaN(p.value)
              ? null
              : <circle key={p.key} class="line-chart__dot" cx={x(p.key)} cy={y(p.value)} r="2.5" fill={accent}>
                  <title>{`${p.key}: ${p.value}`}</title>
                </circle>,
          )}
          <line class="line-chart__axis" x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
          {months.map((m, i) =>
            i % xTickEvery === 0 || i === months.length - 1
              ? <text key={'xt-' + m} class="line-chart__tick" x={x(m)} y={H - padB + 12} text-anchor="middle">{monthShort(m)}</text>
              : null,
          )}
        </svg>
      )}
    </div>
  )
}

/**
 * Default-Label einer Liniendeklaration: "<Aggregate> of <Field>" auf englisch,
 * bzw. das passende i18n-Pendant in der jeweils eingestellten Sprache. Ohne
 * diese Vorgabe stuende auf der Kachel nur der Spaltenname.
 */
function defaultLineLabel(entity, tile, tr) {
  const dateField = findField(entity.schema, tile.dateField)
  const dateLabel = dateField?.label ?? tile.dateField
  if (tile.aggregate === 'count') return tr('dashboard.chart.line.count', dateLabel)
  const sumField = findField(entity.schema, tile.field)
  return tr('dashboard.chart.line.sum', dateLabel, sumField?.label ?? tile.field)
}

function lineTitle(entity, tile, points, max, tr) {
  const sumField = findField(entity.schema, tile.field)
  const label = sumField?.label ?? tile.field ?? ''
  const phrase = tile.aggregate === 'sum' ? tr('dashboard.chart.title.sum', label) : tr('dashboard.chart.title.count')
  return `${entity.schema.plural} · ${phrase} · ${points.length} ${tr('dashboard.chart.title.months')} · max ${max}`
}

const monthShort = (key) => {
  const [y, m] = key.split('-')
  return `${m}/${y.slice(2)}`
}

/**
 * Einheitlicher Chart-Block: { type: 'chart', kind: 'bar'|'donut'|'line', ... }.
 * Wird zusaetzlich zu den bestehenden 'bar' und 'donut' Kacheltypen erkannt
 * und dispatcht an die passende Renderer-Komponente. So koennen neue
 * Beispiele einheitlich 'chart' schreiben, ohne die alten Beispiele zu
 * brechen, die noch 'bar' oder 'donut' verwenden.
 */
function ChartTile({ entity, records, decl, accent, dark, tr }) {
  const props = { entity, records, tile: decl, accent, dark, tr }
  if (decl.kind === 'line') return <LineTile {...props} />
  if (decl.kind === 'donut') return <DonutTile {...props} />
  return <BarTile {...props} />
}

/**
 * Verworfene Chart-Deklarationen erscheinen als eigene Kachel, damit sie im
 * Raster auffallen statt still zu verschwinden - dieselbe Haltung wie bei
 * den Metriken (validateMetrics) und beim Faelligkeits-Widget.
 */
function ChartIssueTile({ decl, issues, tr }) {
  if (!issues.length) return null
  return (
    <div class="tile tile--metric-issue">
      <p class="tile__label">{tr('dashboard.chart.rejected')}</p>
      <ul class="metric-issues">
        {issues.map((issue, i) => (
          <li key={i}>{tr('dashboard.chart.' + issue.code, ...(issue.params ? Object.values(issue.params) : []))}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Fälligkeiten über alle Entitäten, die `schema.dueDate` gesetzt haben - ein
 * Feldschlüssel, genau wie `schema.totalField`. Ohne die Deklaration nimmt
 * diese Funktion die Entität gar nicht erst in den Blick, deshalb ändert sich
 * am Dashboard einer Domäne ohne `dueDate` nichts.
 *
 * `today` kommt von außen durch (Default `new Date()` in groupByDueDate) -
 * das ist die injizierbare Uhr, die die Aufgabe verlangt: ein Test setzt hier
 * ein festes Datum, statt sich auf den Tag zu verlassen, an dem er zufällig
 * läuft.
 */
function DueDateWidget({ entities, recordsByEntity, today, onNavigate, tr }) {
  const groups = groupByDueDate(entities, recordsByEntity, today ? { today } : {})
  const sections = [
    { key: 'overdue', label: tr('dashboard.dueDate.overdue') },
    { key: 'thisWeek', label: tr('dashboard.dueDate.thisWeek') },
    { key: 'upcoming', label: tr('dashboard.dueDate.upcoming') },
  ].filter((s) => groups[s.key].length)

  if (!sections.length) return null

  return (
    <div class="tile due-widget">
      <p class="tile__label">{tr('dashboard.dueDate.title')}</p>
      <div class="due-widget__groups">
        {sections.map((s) => (
          <div class={'due-widget__group due-widget__group--' + s.key} key={s.key}>
            <p class="due-widget__group-label">
              {s.label} <span class="due-widget__count">{groups[s.key].length}</span>
            </p>
            <ul class="due-widget__list">
              {groups[s.key].map(({ entityKey, entity, record, value }) => (
                <li key={entityKey + ':' + record[entity.schema.idField]}>
                  <button
                    class="due-widget__item"
                    onClick={() => onNavigate(entityKey, record[entity.schema.idField])}
                  >
                    <span class="due-widget__title">{record[entity.schema.titleField]}</span>
                    <span class="due-widget__date">{entity.formatDate(value)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Ansicht ──────────────────────────────────────────────────── */

export function DashboardView({
  dashboard,
  entities,
  recordsByEntity,
  defaultEntityKey,
  accent,
  dark,
  examplePrompts,
  locale = 'en',
  onNavigate,
  onShowList,
  today,
  tr,
}) {
  /**
   * Kennzahlen je Entität, die eine deklariert hat - die Entität steckt in der
   * Deklaration selbst, anders als bei DASHBOARD-Tiles gibt es hier keinen
   * Default, der von der gerade offenen Ansicht abhinge. Ungültige Einträge
   * kommen als Verwerfungen mit, damit nichts still verschwindet.
   */
  const metricTiles = Object.entries(entities).flatMap(([key, entity]) => {
    const { metrics, issues } = validateMetrics(entity.schema)
    if (!metrics.length && !issues.length) return []
    const records = recordsByEntity[key] ?? []
    return [
      ...metrics.map((metric, i) => (
        <MetricTile
          key={'metric:' + key + ':' + i}
          entityKey={key}
          entity={entity}
          records={records}
          metric={metric}
          locale={locale}
          onShowList={onShowList}
        />
      )),
      <MetricIssueTile key={'metric-issues:' + key} entity={entity} issues={issues} tr={tr} />,
    ]
  })
  return (
    <div class="dashboard">
      {examplePrompts && (
        <div class="dashboard__hint">
          <Hint show id="dashboard" tr={tr} />
        </div>
      )}
      {metricTiles}
      {hasDueDates(entities) && (
        <DueDateWidget entities={entities} recordsByEntity={recordsByEntity} today={today} onNavigate={onNavigate} tr={tr} />
      )}
      {dashboard?.tiles?.map((tile, i) => {
        const key = tile.entity ?? defaultEntityKey
        const entity = entities[key]
        if (!entity) return null
        const records = recordsByEntity[key] ?? []
        const props = { entity, records, tile, accent, dark, tr }
        if (tile.type === 'bar') return <BarTile key={i} {...props} />
        if (tile.type === 'donut') return <DonutTile key={i} {...props} />
        if (tile.type === 'chart') return <ChartTile key={i} entity={entity} records={records} decl={tile} accent={accent} dark={dark} tr={tr} />
        if (tile.type === 'line') return <LineTile key={i} {...props} />
        return <StatTile key={i} {...props} />
      })}
      {dashboard?.charts?.map((decl, i) => {
        const key = decl.entity ?? defaultEntityKey
        const entity = entities[key]
        if (!entity) return null
        const records = recordsByEntity[key] ?? []
        const issues = validateChart(decl, entity)
        if (issues.length) return <ChartIssueTile key={'chart-issue:' + i} decl={decl} issues={issues} tr={tr} />
        return <ChartTile key={'chart:' + i} entity={entity} records={records} decl={decl} accent={accent} dark={dark} tr={tr} />
      })}
    </div>
  )
}
