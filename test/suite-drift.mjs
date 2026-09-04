// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for scripts/check-suite-drift.js (OPEN-124).
 *
 * Akzeptanzkriterien aus OPEN-124:
 *
 *   - Synchronstand: ok=true, keine Diagnose.
 *   - Reihenfolge in scripts.test weicht ab: ok=false, Diagnose nennt
 *     Datei und Position ("position N erwartet=X gefunden=Y").
 *   - Suite fehlt in README.md: ok=false, Diagnose nennt Datei und den
 *     fehlenden Namen ("missing suite 'X'").
 *   - Suite aus scripts.test fehlt in CONTRIBUTING.md-Prosa: ok=false.
 *   - Zaehl-Behauptung in entwickler.md weicht ab: ok=false.
 *
 * Die reine Logik wird synthetisch geprueft, weil der echte Repo-Stand
 * seit OPEN-123 synchron ist; die CI validiert die echten Dateien.
 */
import { strict as assert } from 'node:assert'
import { validateSuiteDrift } from '../scripts/check-suite-drift.js'

const SCRIPTS_TEST = [
  'prompts-metrics', 'actions-delete-guard', 'timezone', 'domain-swap-crash',
  'views', 'board', 'charts', 'changelog',
  'smoke', 'multi-entity', 'demos', 'timezone-examples',
]

const PKG = (suites) => JSON.stringify({
  name: 'test',
  scripts: {
    test: suites.map((s) => `node test/${s}.mjs`).join(' && '),
  },
})

const README = `# Tool

## Testing

\`\`\`bash
npm test
\`\`\`

Runs twelve suites — three of them against a real headless Chromium:

${SCRIPTS_TEST.map((s, i) => `- \`test/${s}.mjs\` — synthetic fixture ${i + 1}.`).join('\n')}
`

const README_DE = `# Werkzeug

## Testen

\`\`\`bash
npm test
\`\`\`

Fährt zwölf Testsuiten — drei davon gegen einen echten Headless-Chromium:

${SCRIPTS_TEST.map((s, i) => `- \`test/${s}.mjs\` — synthetisches Beispiel ${i + 1}.`).join('\n')}
`

const CONTRIBUTING = `# Contributing

## Before opening a pull request

\`\`\`bash
npm test
\`\`\`

\`npm test\` runs twelve suites: pure Node checks on the generated build prompts, the action
validation's reference guard, the crash-safe fixture swap behind the extra builds and the
local-calendar due dates — for the framework and for every example domain under \`examples/\` — plus
the saved-views machinery, the kanban-board library, the chart math, and the
CHANGELOG-order validator; two end-to-end suites that drive a real headless
browser against the built file over \`file://\`; and one that opens every built demo.
`

const PRODUKT = `# Produktprofil

| Zweck | Befehl |
|---|---|
| Prüfen | \`npm test\` (zwölf Suiten: ${SCRIPTS_TEST.join(', ')}) |

## Was die CI erzwingt

- alle zwölf Testsuiten laufen durch
`

const ENTWICKLER = `# Entwickler

6. \`npm run build && npm test\`. Alle zwölf Suiten müssen laufen.
`

const FILES = {
  'README.md': README,
  'README.de.md': README_DE,
  'CONTRIBUTING.md': CONTRIBUTING,
  '.multica/agents/_produkt.md': PRODUKT,
  '.multica/agents/entwickler.md': ENTWICKLER,
}

/* ── Positiver Fall ─────────────────────────────────────────────── */

const good = validateSuiteDrift(PKG(SCRIPTS_TEST), FILES)
assert.equal(good.ok, true, `good should pass: ${good.errors.join(' | ')}`)
assert.equal(good.scriptsTest.length, 12, 'good: twelve suites parsed')

/* ── scripts.test umgeordnet ────────────────────────────────────── */

const reordered = [...SCRIPTS_TEST.slice(2), SCRIPTS_TEST[0], SCRIPTS_TEST[1]]
const r1 = validateSuiteDrift(PKG(reordered), FILES)
assert.equal(r1.ok, false, 'reordered scripts.test must fail')
assert.ok(
  r1.errors.some((e) => e === 'README.md:position 1 erwartet=timezone gefunden=prompts-metrics'),
  'r1 should report README.md position 1 with expected/found',
)
assert.ok(
  r1.errors.some((e) => e === '.multica/agents/_produkt.md:position 1 erwartet=timezone gefunden=prompts-metrics'),
  'r1 should report _produkt.md position 1 with expected/found',
)
assert.ok(
  r1.errors.every((e) => !e.includes('CONTRIBUTING.md:position')),
  'r1 must not order-check CONTRIBUTING.md (prose)',
)

/* ── Suite fehlt in README.md ───────────────────────────────────── */

const README_MISSING_VIEWS = README.replace('- `test/views.mjs` —', '- removed --')
const r2 = validateSuiteDrift(PKG(SCRIPTS_TEST), { ...FILES, 'README.md': README_MISSING_VIEWS })
assert.equal(r2.ok, false, 'README.md missing views must fail')
assert.ok(
  r2.errors.some((e) => e === "README.md: missing suite 'views'"),
  'r2 should report README.md missing views',
)
assert.ok(
  r2.errors.some((e) => e === 'README.md:position 5 erwartet=views gefunden=board'),
  'r2 should report position drift downstream of the gap',
)

/* ── Suite in Doku, nicht in scripts.test ───────────────────────── */

const EXTRA_NAME = 'nonexistent-suite'
const README_EXTRA = README + `\n- \`test/${EXTRA_NAME}.mjs\` — this should fail.\n`
const r3 = validateSuiteDrift(PKG(SCRIPTS_TEST), { ...FILES, 'README.md': README_EXTRA })
assert.equal(r3.ok, false, 'unknown suite in README.md must fail')
assert.ok(
  r3.errors.some((e) => e === `README.md: suite '${EXTRA_NAME}' is not in scripts.test`),
  'r3 should report unknown suite name',
)

/* ── Suite fehlt in CONTRIBUTING.md-Prosa ───────────────────────── */

const CONTRIBUTING_NO_BOARD = CONTRIBUTING.replace('kanban-board library', 'board library')
const r4 = validateSuiteDrift(PKG(SCRIPTS_TEST), { ...FILES, 'CONTRIBUTING.md': CONTRIBUTING_NO_BOARD })
assert.equal(r4.ok, false, 'CONTRIBUTING.md missing kanban-board phrase must fail')
assert.ok(
  r4.errors.some((e) => e === "CONTRIBUTING.md: suite 'board' is not mentioned"),
  'r4 should report board not mentioned',
)

/* ── Zaehl-Behauptung in entwickler.md weicht ab ────────────────── */

const ENTWICKLER_WRONG = ENTWICKLER.replace('Alle zwölf Suiten', 'Alle elf Suiten')
const r5 = validateSuiteDrift(PKG(SCRIPTS_TEST), { ...FILES, '.multica/agents/entwickler.md': ENTWICKLER_WRONG })
assert.equal(r5.ok, false, 'wrong count claim in entwickler.md must fail')
assert.ok(
  r5.errors.some((e) => e === '.multica/agents/entwickler.md: count claim 11 does not match scripts.test length 12'),
  'r5 should report count mismatch',
)

/* ── Suite fehlt in scripts.test ────────────────────────────────── */

const SCRIPTS_MISSING_VIEWS = SCRIPTS_TEST.filter((s) => s !== 'views')
const r6 = validateSuiteDrift(PKG(SCRIPTS_MISSING_VIEWS), FILES)
assert.equal(r6.ok, false, 'scripts.test missing views must fail')
assert.ok(
  r6.errors.some((e) => e === "README.md: suite 'views' is not in scripts.test"),
  'r6 should report README.md: views not in scripts.test',
)
assert.ok(
  r6.errors.some((e) => e === '.multica/agents/entwickler.md: count claim 12 does not match scripts.test length 11'),
  'r6 should report entwickler.md count claim drift',
)

/* ── _produkt.md parens list umgeordnet ─────────────────────────── */

const PRODUKT_REORDERED = PRODUKT.replace(
  `Suiten: ${SCRIPTS_TEST.join(', ')}`,
  `Suiten: ${SCRIPTS_TEST.slice(1).join(', ')}, ${SCRIPTS_TEST[0]}`,
)
const r7 = validateSuiteDrift(PKG(SCRIPTS_TEST), { ...FILES, '.multica/agents/_produkt.md': PRODUKT_REORDERED })
assert.equal(r7.ok, false, '_produkt.md parens list reordered must fail')
assert.ok(
  r7.errors.some((e) => e === '.multica/agents/_produkt.md:position 1 erwartet=prompts-metrics gefunden=actions-delete-guard'),
  'r7 should report _produkt.md position 1',
)

/* ── Leere scripts.test ─────────────────────────────────────────── */

const r8 = validateSuiteDrift(PKG([]), FILES)
assert.equal(r8.ok, false, 'empty scripts.test must fail')
assert.ok(
  r8.errors.some((e) => /scripts\.test/.test(e)),
  'r8 should report empty scripts.test',
)

console.log('suite-drift: all assertions passed')