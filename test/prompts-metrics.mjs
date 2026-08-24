// SPDX-License-Identifier: Apache-2.0
// Prüft den Metrik-Abschnitt des generierenden Prompts (scripts/build-prompts.mjs).
//
// Die Kennzahlen aus `schema.metrics` (OPEN-34) müssen im Prompt so beschrieben
// sein, dass ein Agent, der nur den Prompt liest, dieselben Kacheln baut wie
// die Demo sie zeigt: alle drei Formen des geschlossenen Katalogs, das
// Auswahlkriterium als Quelltext, das Feld mit seiner Beschriftung - und die
// Vorgabe-Beschriftung dort, wo die Deklaration kein Label nennt.
//
// Reiner Knoten-Test, kein Browser: der Prompt ist Text, und die Generierung
// darf beim Import nichts schreiben.
import { metricsLines } from '../scripts/build-prompts.mjs'
import { strings } from '../scripts/prompts/strings.mjs'
import { SCHEMA as METRICS_SCHEMA } from './fixtures/metrics.domain.js'
import { ENTITIES } from './fixtures/metrics-multi.domain.js'

const t = strings.en

let failed = 0
const check = (name, cond) => {
  if (!cond) {
    console.error(`FEHLER: ${name}`)
    failed++
  }
}

const block = metricsLines(METRICS_SCHEMA, t)
const text = block.join('\n')

/* Der Abschnitt steht überhaupt an - Kopf und Einleitung in jeder Sprache,
   denn build-prompts generiert sieben davon und eine fehlende Übersetzung
   würde still "undefined" in den Prompt schreiben. */
check('Abschnitt mit Kopf und Einleitung', /Metric tiles/.test(text) && block.length > 4)

for (const [code, lang] of Object.entries(strings)) {
  const lines = metricsLines(METRICS_SCHEMA, lang)
  check(
    `Sprache ${code}: Kopf, Einleitung und je Deklaration eine Zeile`,
    typeof lines[0] === 'string' &&
      lines[0].startsWith('**') &&
      lines.some((l) => l.startsWith('- ')) &&
      lines.filter((l) => l.startsWith('- ')).length === METRICS_SCHEMA.metrics.length &&
      !lines.join('\n').includes('undefined'),
  )
}

/* count ohne Kriterium, mit Beschriftung und Hinweistext. */
check(
  'count ohne Kriterium führt Label und Hinweis',
  block.some((l) => l.includes('**Tasks in file**') && l.includes('all statuses')),
)

/* count mit Kriterium: das Auswahlkriterium als Quelltext, wie bei den Tiles. */
check(
  'count mit Kriterium nennt das Kriterium',
  block.some((l) => l.includes('**Open tasks**') && l.includes("`r.status !== 'done'`")),
)

/* sum und avg benennen das Feld mit seiner Beschriftung. */
check(
  'sum nennt Feld und Beschriftung',
  block.some((l) => l.includes('**Total effort**') && l.includes('`effort`') && l.includes('Effort')),
)
check(
  'avg nennt Feld und Beschriftung',
  block.some((l) => l.includes('**Average effort**') && l.includes('average of')),
)

/* Ohne Label tritt die Vorgabe ein: der Plural beim count. */
const unlabeled = metricsLines(ENTITIES.certificates.schema, strings.en).join('\n')
check(
  'count ohne Label trägt den Plural',
  unlabeled.includes('**certificates**'),
)

/* Keine Deklaration, kein Abschnitt - Domänen ohne metrics sehen ihren alten
   Prompt, byteidentisch wie ihr Dashboard. */
check('ohne metrics kein Abschnitt', metricsLines(ENTITIES.suppliers.schema, t).length === 0)
check('leere metrics kein Abschnitt', metricsLines({ ...METRICS_SCHEMA, metrics: [] }, t).length === 0)

if (failed) {
  console.error(`\n${failed} Prüfungen fehlgeschlagen.`)
  process.exit(1)
}
console.log('prompts-metrics: alle Prüfungen grün.')
