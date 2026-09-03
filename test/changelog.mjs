// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for scripts/check-changelog.mjs.
 *
 * Vier Akzeptanzkriterien aus OPEN-121:
 *
 *   - Abschnittsfolge strikt absteigend, [Unreleased] zuerst
 *   - jede Version hat eine Link-Definition, und die verlinkte Tag-Referenz
 *     existiert auf origin
 *   - kein Host ausserhalb der Erlaubtenliste (github.com, keepachangelog.com,
 *     semver.org) - "keine neue externe Referenz im Diff"
 *
 * Die reine Logik wird synthetisch geprueft, weil der echte CHANGELOG.md in
 * der OPEN-120-Reihenfolge steht; der eigentliche Reihenfolge-Check kommt
 * erst nach dem OPEN-120-Merge zurueck. CI validiert die echte Datei.
 */
import { strict as assert } from 'node:assert'
import { validateChangelog } from '../scripts/check-changelog.mjs'

const KNOWN = new Set([
  'v0.18.0', 'v0.17.0', 'v0.16.1', 'v0.16.0', 'v0.15.0', 'v0.14.0',
])

const HEADER = `# Changelog

All notable changes documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).
`

/* ── Positiver Fall ─────────────────────────────────────────────── */

const good = `${HEADER}
## [Unreleased]

## [0.18.0] — 2026-08-31

Body.

## [0.17.0] — 2026-08-28

Body.

[Unreleased]: https://github.com/m-dohmen/openToolbox/compare/v0.18.0...HEAD
[0.18.0]: https://github.com/m-dohmen/openToolbox/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/m-dohmen/openToolbox/compare/v0.16.1...v0.17.0
`
const goodResult = validateChangelog(good, KNOWN)
assert.equal(
  goodResult.ok,
  true,
  `good should pass: ${goodResult.errors.join(' | ')}`,
)
assert.equal(goodResult.sections.length, 3, 'good: three sections parsed')

/* ── [Unreleased] nicht an erster Stelle ─────────────────────────── */

const unreleasedMid = `${HEADER}
## [0.18.0] — 2026-08-31

Body.

## [Unreleased]

## [0.17.0] — 2026-08-28

Body.

[Unreleased]: https://github.com/m-dohmen/openToolbox/compare/v0.18.0...HEAD
[0.18.0]: https://github.com/m-dohmen/openToolbox/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/m-dohmen/openToolbox/compare/v0.16.1...v0.17.0
`
const unreleasedMidResult = validateChangelog(unreleasedMid, KNOWN)
assert.equal(unreleasedMidResult.ok, false, '[Unreleased] in der Mitte muss scheitern')
assert.ok(
  unreleasedMidResult.errors.some((e) => /first section must be '## \[Unreleased\]'/.test(e)),
  'good sollte den First-Section-Fehler nennen',
)

/* ── Reihenfolge umgedreht (0.17 vor 0.18) ──────────────────────── */

const outOfOrder = `${HEADER}
## [Unreleased]

## [0.17.0] — 2026-08-28

Body.

## [0.18.0] — 2026-08-31

Body.

[Unreleased]: https://github.com/m-dohmen/openToolbox/compare/v0.18.0...HEAD
[0.17.0]: https://github.com/m-dohmen/openToolbox/compare/v0.16.1...v0.17.0
[0.18.0]: https://github.com/m-dohmen/openToolbox/compare/v0.17.0...v0.18.0
`
const outOfOrderResult = validateChangelog(outOfOrder, KNOWN)
assert.equal(outOfOrderResult.ok, false, 'Reihenfolge 0.17 vor 0.18 muss scheitern')
assert.ok(
  outOfOrderResult.errors.some((e) => /strictly below/.test(e)),
  'good sollte einen Reihenfolge-Fehler nennen',
)

/* ── Zweites [Unreleased] taucht auf ────────────────────────────── */

const twoUnreleased = `${HEADER}
## [Unreleased]

## [Unreleased]

Body.

[Unreleased]: https://github.com/m-dohmen/openToolbox/compare/v0.18.0...HEAD
`
const twoUnreleasedResult = validateChangelog(twoUnreleased, KNOWN)
assert.equal(twoUnreleasedResult.ok, false, 'zweites [Unreleased] muss scheitern')
assert.ok(
  twoUnreleasedResult.errors.some((e) => /is only allowed as the first section/.test(e)),
  'good sollte den Duplikat-Fehler nennen',
)

/* ── Versionsabschnitt ohne Link-Definition ──────────────────────── */

const noLink = `${HEADER}
## [Unreleased]

## [0.18.0] — 2026-08-31

Body.

[Unreleased]: https://github.com/m-dohmen/openToolbox/compare/v0.18.0...HEAD
`
const noLinkResult = validateChangelog(noLink, KNOWN)
assert.equal(noLinkResult.ok, false, 'fehlende Link-Definition muss scheitern')
assert.ok(
  noLinkResult.errors.some((e) => /\[0\.18\.0\] is missing a link definition/.test(e)),
  'good sollte den fehlenden Link nennen',
)

/* ── Versionslink verweist auf nicht existierenden Tag ───────────── */

const unknownTag = `${HEADER}
## [Unreleased]

## [9.9.9] — 2099-01-01

Body.

[Unreleased]: https://github.com/m-dohmen/openToolbox/compare/v0.18.0...HEAD
[9.9.9]: https://github.com/m-dohmen/openToolbox/releases/tag/v9.9.9
`
const unknownTagResult = validateChangelog(unknownTag, KNOWN)
assert.equal(unknownTagResult.ok, false, 'unbekannter Tag muss scheitern')
assert.ok(
  unknownTagResult.errors.some((e) => /v9\.9\.9.*does not exist/.test(e)),
  'good sollte den unbekannten Tag nennen',
)

/* ── Fremder externer Host ──────────────────────────────────────── */

const forbiddenHost = `${HEADER}
## [Unreleased]

[Unreleased]: https://example.com/foo
`
const forbiddenHostResult = validateChangelog(forbiddenHost, KNOWN)
assert.equal(forbiddenHostResult.ok, false, 'example.com muss scheitern')
assert.ok(
  forbiddenHostResult.errors.some((e) => /example\.com/.test(e)),
  'good sollte den fremden Host nennen',
)

/* ── Leere Datei ────────────────────────────────────────────────── */

const emptyResult = validateChangelog('', KNOWN)
assert.equal(emptyResult.ok, false, 'leere Eingabe muss scheitern')

console.log('changelog: all assertions passed')