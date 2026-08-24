// SPDX-License-Identifier: Apache-2.0
/**
 * Erzeugt je Demo und Sprache einen Aufbau-Prompt:
 * docs/demos/<slug>/generating_prompt_<lang>.md
 *
 * Der Prompt liest sich wie eine fachliche Anforderung an einen KI-Agenten:
 * *„Bau mir dieses Werkzeug."* Wer ihn zusammen mit dem Repository an Claude
 * Code, Cowork oder Codex gibt, bekommt die gezeigte Anwendung zurück.
 *
 * **Generiert statt geschrieben, und zwar aus der laufenden Domäne.** Vierzig
 * von Hand gepflegte Anforderungsdokumente wären nach dem dritten Feldwechsel
 * falsch, ohne dass es jemand merkt - und ein falscher Prompt ist schlimmer als
 * gar keiner, weil er glaubwürdig aussieht. Alles Mechanische (Felder, Typen,
 * Regeln, Kacheln, Schritte) stammt deshalb direkt aus `examples/*.domain.js`.
 *
 * Übersetzt wird nur die Anweisung. Feldbeschriftungen, Aufzählungswerte und
 * Regelmeldungen bleiben in der Sprache des Werkzeugs - ein französischer
 * Prompt soll dasselbe deutsche Prüfbuch erzeugen, nicht ein anderes.
 *
 *   npm run prompts
 */
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DEMOS } from './demos.mjs'
import { LANGS, strings } from './prompts/strings.mjs'
import { PROBLEMS } from './prompts/problems.mjs'
import { validateMetrics } from '../src/lib/metrics.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = 'https://github.com/m-dohmen/openToolbox'
const SITE = 'https://m-dohmen.github.io/openToolbox/demos'

const fill = (template, ...args) => args.reduce((s, a) => s.replace('%s', a), template)
const code = (list) => list.map((k) => `\`${k}\``).join(', ')

/** Die Bedingung einer Regel oder eines Schritts als einzeiliger Ausdruck. */
const source = (fn) =>
  String(fn)
    .replace(/^\s*\(?\s*(r|drafts)\s*\)?\s*=>\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Rumpf einer Berechnung. Mehrzeilige Funktionen behalten ihre Zeilen und
 * werden ausgerückt - platt gedrueckt sind sie unlesbar, und gerade die
 * Berechnung ist der Teil, den der Agent verstehen muss.
 */
function body(fn) {
  const raw = String(fn).replace(/^\s*\(?\s*r\s*\)?\s*=>\s*/, '').trim()
  if (!raw.includes('\n')) return { inline: raw }

  /* Nur die Klammer und ihren Zeilenumbruch entfernen, nicht die Einrueckung
     der ersten Rumpfzeile - sonst rutscht sie beim Ausruecken heraus. */
  const lines = raw
    .replace(/^\{[ \t]*\r?\n/, '')
    .replace(/\r?\n[ \t]*\}$/, '')
    .split('\n')
  const indent = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length),
  )
  return { block: lines.map((l) => l.slice(indent)).join('\n').trimEnd() }
}

function fieldRow(field, t) {
  const detail = []
  if (field.required) detail.push(t.required)
  if (field.type === 'enum') detail.push(fill(t.oneOf, field.values.join(' · ')))
  if (field.type === 'reference') detail.push(fill(t.refTo, field.entity))
  if (field.type === 'computed') detail.push(t.computedFrom)
  if (field.type === 'attachment') detail.push(t.attachmentNote)
  if (field.long) detail.push(t.longText)
  if (field.short) detail.push(fill(t.shortHead, field.short))
  return `| \`${field.key}\` | ${field.label} | ${field.type ?? 'text'} | ${detail.join(', ') || '—'} |`
}

/**
 * Der Metrik-Abschnitt einer Entität. Die Prüfung läuft über dasselbe
 * validateMetrics wie die Anwendung - der Prompt beschreibt genau die
 * Kennzahlen, die auch als Kacheln erscheinen, nicht eine davon abweichende
 * Zweitinterpretation. Kriterium und Feld werden wörtlich übernommen, damit
 * ein Agent, der nur den Prompt liest, dieselben Kacheln baut wie die Demo
 * sie zeigt.
 */
export function metricsLines(schema, t) {
  const { metrics } = validateMetrics(schema)
  if (!metrics.length) return []
  const out = [`**${t.metrics}**`, '', t.metricsIntro, '', `*${t.metricsNote}*`, '']
  for (const m of metrics) {
    let line
    if (m.op === 'count') {
      line = `- **${m.label}** — ${t.metricCount}`
    } else {
      const fieldLabel = schema.fields.find((f) => f.key === m.field)?.label ?? m.field
      line = `- **${m.label}** — ${fill(m.op === 'sum' ? t.metricSum : t.metricAvg, `\`${m.field}\` (${fieldLabel})`)}`
    }
    if (m.filter) line += `${t.tileFiltered}: \`${source(m.filter)}\``
    if (m.caption) line += ` · „${m.caption}“`
    out.push(line)
  }
  return [...out, '']
}

function entitySection(key, entity, t, single, multi) {
  const s = entity.schema
  const out = []

  out.push(single ? fill(t.singleIntro, s.singular, s.plural) : fill(t.entityIntro, key, s.singular, s.plural))
  out.push('')

  out.push(`**${t.fields}**`, '')
  out.push(`| ${t.thKey} | ${t.thLabel} | ${t.thType} | ${t.thDetail} |`)
  out.push('| --- | --- | --- | --- |')
  for (const f of s.fields) out.push(fieldRow(f, t))
  out.push('')

  out.push(`**${t.presentation}**`, '')
  out.push(`- ${fill(t.titleField, s.titleField)}`)
  if (s.subField) out.push(`- ${fill(t.subFieldRow, s.subField)}`)
  out.push(`- ${fill(t.listRow, code(s.list))}`)
  if (s.facets?.length) out.push(`- ${fill(t.facetsRow, code(s.facets))}`)
  if (s.search?.length) out.push(`- ${fill(t.searchRow, code(s.search))}`)
  if (s.totalField) out.push(`- ${fill(t.totalRow, s.totalField)}`)
  out.push(`- ${fill(t.doneRow, '`' + source(entity.isDone) + '`')}`)
  out.push(`- ${fill(t.overdueRow, '`' + source(entity.isOverdue) + '`')}`)
  out.push('')

  const computed = s.fields.filter((f) => f.type === 'computed')
  if (computed.length) {
    out.push(`**${t.computed}**`, '', t.computedIntro, '')
    for (const f of computed) {
      const b = body(f.compute)
      if (b.inline) {
        out.push(`- \`${f.key}\` (${f.label}) — \`${b.inline}\``)
      } else {
        out.push(`- \`${f.key}\` (${f.label}):`, '', '  ```js', ...b.block.split('\n').map((l) => '  ' + l), '  ```')
      }
    }
    out.push('')
  }

  if (s.rules?.length) {
    out.push(`**${t.rules}**`, '', t.rulesIntro, '')
    for (const rule of s.rules) {
      const when = rule.when ? `\`${source(rule.when)}\`` : t.ruleAlways
      const then = []
      if (rule.require?.length) then.push(code(rule.require))
      if (rule.check) then.push(`\`${source(rule.check)}\``)
      out.push(`- **${t.ruleWhen}** ${when} → **${t.ruleThen}** ${then.join(' + ')}`)
      out.push(`  **${t.ruleMessage}:** „${rule.message}“`)
    }
    out.push('')
  }

  out.push(...metricsLines(s, t))

  if (multi) out.push('---', '')
  return out
}

function tileLine(tile, t, entities, defaultKey) {
  const key = tile.entity ?? defaultKey
  const schema = entities[key].schema
  const label = tile.label ?? tile.groupBy ?? ''
  const measure =
    tile.measure === 'count' || !tile.measure
      ? t.measureCount
      : `\`${tile.measure}\` (${schema.fields.find((f) => f.key === tile.measure)?.label ?? tile.measure})`

  let line
  if (tile.type === 'stat') line = fill(t.tileStat, `**${label}** — ${measure}`)
  else if (tile.type === 'bar') line = fill(t.tileBar, tile.groupBy, measure) + (label ? ` — **${label}**` : '')
  else line = fill(t.tileDonut, tile.groupBy)

  if (tile.filter) line += `${t.tileFiltered}: \`${source(tile.filter)}\``
  if (tile.caption) line += ` · „${tile.caption}“`
  return `- ${line}`
}

function build(demo, lang) {
  const t = strings[lang]
  const mod = demo.module
  const entities = mod.ENTITIES ?? { records: { schema: mod.SCHEMA, isDone: mod.isDone, isOverdue: mod.isOverdue } }
  const keys = Object.keys(entities)
  const single = keys.length === 1
  const out = []

  out.push(`<!-- Generated by scripts/build-prompts.mjs — do not edit by hand. -->`)
  out.push(`# ${t.intro}: ${demo.settings.title}`, '')
  out.push(`*${t.lead}*`, '')

  out.push(`## ${t.startHere}`, '')
  out.push(fill(t.startBody, REPO), '')
  out.push(`> ${t.startSkill}`, '')

  out.push(`## ${t.problem}`, '')
  out.push(PROBLEMS[demo.slug][lang], '')

  out.push(`## ${t.result}`, '')
  out.push(t.resultBody, '')

  out.push(`## ${single ? t.recordsOne : t.records}`, '')
  for (const key of keys) out.push(...entitySection(key, entities[key], t, single, !single))

  if (mod.DASHBOARD?.tiles?.length) {
    out.push(`## ${t.dashboard}`, '', t.dashboardIntro, '')
    for (const tile of mod.DASHBOARD.tiles) out.push(tileLine(tile, t, entities, keys[0]))
    out.push('')
  }

  if (mod.WIZARD?.steps?.length) {
    out.push(`## ${t.wizard}`, '', t.wizardIntro, '')
    out.push(fill(t.wizardTitle, mod.WIZARD.title), '')
    if (mod.WIZARD.intro) out.push(`> ${mod.WIZARD.intro}`, '')
    mod.WIZARD.steps.forEach((step, i) => {
      const what =
        step.type === 'csv'
          ? t.wizardCsv
          : step.type === 'review'
            ? t.wizardReview
            : fill(t.wizardFields, code(step.fields ?? []))
      const entity = !single && step.entity ? ` \`${step.entity}\`` : ''
      out.push(`${i + 1}. **${t.wizardStep} ${i + 1}${entity}** — ${step.label ? `${step.label}: ` : ''}${what}`)
      if (step.when) out.push(`   ${fill(t.wizardWhen, '`' + source(step.when) + '`')}`)
    })
    out.push('')
    if (mod.WIZARD.done?.message) out.push(fill(t.wizardDone, mod.WIZARD.done.message), '')
  }

  out.push(`## ${t.settings}`, '', t.settingsIntro, '')
  out.push(`- ${t.setTitle}: **${demo.settings.title}**`)
  out.push(`- ${t.setSubtitle}: ${demo.settings.subtitle}`)
  out.push(`- ${t.setFile}: \`${demo.settings.fileStem}\``)
  if (demo.settings.version) out.push(`- ${t.setVersion}: \`${demo.settings.version}\``)
  out.push(`- ${t.setLocale}: \`${demo.locale ?? 'en'}\``)
  out.push(
    `- ${t.setMode}: ${demo.settings.mode === 'intake' ? t.setModeIntake : t.setModeWorkbench}`,
  )
  out.push(
    `- ${t.setColors}: ` +
      Object.entries(demo.colors)
        .map(([k, v]) => `\`${k}\` ${v}`)
        .join(' · '),
  )
  out.push('')

  out.push(`## ${t.startPage}`, '', t.startPageIntro, '')
  out.push('```markdown', demo.home, '```', '')

  const seedCount = single
    ? (mod.seed?.().length ?? 10)
    : keys.map((k) => `${entities[k].schema.plural}: ${mod.ENTITIES[k].seed().length}`).join(', ')
  out.push(`## ${t.seedHead}`, '', fill(t.seedBody, seedCount), '')

  out.push(`## ${t.done}`, '')
  for (const item of t.doneItems) out.push(`- ${item}`)
  out.push('')

  out.push(`## ${t.handover}`, '', t.handoverBody, '')

  out.push('---', '')
  out.push(`*${fill(t.footer, demo.example, `${SITE}/${demo.slug}/`)}*`, '')
  out.push(`*${t.disclaimer}*`, '')

  return out.join('\n')
}

/* Nur beim direkten Aufruf schreiben. Importiert das Modul - der Test für den
   Metrik-Abschnitt tut genau das - soll es nur seine Funktionen liefern und
   nichts unter docs/demos anfassen. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let written = 0
  for (const demo of DEMOS) {
    demo.module = await import(pathToFileURL(resolve(root, 'examples', demo.example)).href)
    for (const lang of LANGS) {
      const file = resolve(root, 'docs/demos', demo.slug, `generating_prompt_${lang}.md`)
      writeFileSync(file, build(demo, lang))
      written++
    }
    console.log(`${demo.slug.padEnd(20)} ${LANGS.length} prompts`)
  }

  console.log(`\n${written} prompts written under docs/demos/.`)
}
