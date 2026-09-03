#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * CI guard fuer CHANGELOG.md (Keep-a-Changelog-Konformitaet, OPEN-121).
 *
 * Vier Akzeptanzkriterien, jeder Verstoss faellt den Job:
 *
 *   1. Abschnittsfolge strikt absteigend, [Unreleased] als erster Abschnitt.
 *   2. Jeder Versionsabschnitt traegt eine Definition '[X.Y.Z]: <URL>' und
 *      verweist auf einen Tag, der auf origin existiert. Wer eine geplante
 *   Version verlinkt, die noch nicht getaggt ist, kippt hier raus.
 *   3. Kein externer Host ausserhalb {github.com, keepachangelog.com,
 *      semver.org}. CHANGELOG.md soll keine neuen externen Verweise
 *      einschleusen.
 *
 * validateChangelog(text, knownTags) ist die reine Pruefroutine und wird
 * von test/changelog.mjs gegen synthetische Eingaben gefahren. Der CLI-
 * Wrapper liest CHANGELOG.md, holt die Tags ueber `git ls-remote --tags
 * origin` und beendet mit Exit 1 beim ersten Verste.
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const ALLOWED_HOSTS = new Set(['github.com', 'keepachangelog.com', 'semver.org'])

const SECTION_RE = /^## \[(.+?)\](?:\s+—\s+\d{4}-\d{2}-\d{2})?$/
const LINK_RE = /^\[([^\]]+)\]:\s+(\S+)\s*$/gm
const URL_RE = /https?:\/\/([^\s/)\]>]+)/g
const TAG_REF_RE = /\bv(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)\b/

function cmpSemver(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0
    const y = pb[i] || 0
    if (x !== y) return x - y
  }
  return 0
}

export function validateChangelog(text, knownTags) {
  const errors = []
  const sections = []
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(SECTION_RE)
    if (m) sections.push({ title: m[1], line: i + 1 })
  }

  if (sections.length === 0) {
    errors.push(`no sections found; expected at least '## [Unreleased]'`)
    return { ok: false, errors, sections }
  }

  // (1) Erster Abschnitt muss [Unreleased] sein.
  if (sections[0].title !== 'Unreleased') {
    errors.push(
      `line ${sections[0].line}: first section must be '## [Unreleased]', got '## [${sections[0].title}]'`,
    )
  }

  // (1) Danach strikt absteigende semver-Reihenfolge; [Unreleased] ist
  // ausschliesslich am Anfang erlaubt.
  for (let i = 1; i < sections.length; i++) {
    const prev = sections[i - 1].title
    const cur = sections[i].title
    if (cur === 'Unreleased') {
      errors.push(
        `line ${sections[i].line}: '[Unreleased]' is only allowed as the first section`,
      )
      continue
    }
    // [Unreleased] hat kein semver; jeder Versions-Abschnitt gilt als neuer
    // als [Unreleased] und braucht keinen eigenen Vergleich dorthin. Der
    // semver-Check greift erst zwischen zwei tatsaechlichen Versionen.
    if (prev === 'Unreleased') continue
    if (cmpSemver(cur, prev) >= 0) {
      errors.push(
        `line ${sections[i].line}: version [${cur}] is not strictly below [${prev}] (Keep a Changelog requires descending order)`,
      )
    }
  }

  // (2) Jede Version braucht eine Link-Definition, und ein referenzierter Tag
  // muss auf origin existieren. [Unreleased] ist hier befreit: ein leerer
  // Sammelabschnitt hat noch keinen Link.
  const links = new Map()
  for (const m of text.matchAll(LINK_RE)) {
    links.set(m[1], m[2])
  }
  for (const s of sections) {
    if (s.title === 'Unreleased') continue
    const url = links.get(s.title)
    if (!url) {
      errors.push(
        `line ${s.line}: section [${s.title}] is missing a link definition (expected '[${s.title}]: <compare-or-release URL>')`,
      )
      continue
    }
    const m = url.match(TAG_REF_RE)
    if (!m) continue
    const tag = 'v' + m[1]
    if (!knownTags.has(tag)) {
      errors.push(
        `line ${s.line}: section [${s.title}] links to '${tag}' which does not exist on origin; cut the tag first or keep the entry under [Unreleased]`,
      )
    }
  }

  // (3) Externe Hosts bleiben in der Erlaubtenliste. Eine CHANGELOG.md, die
  // einen dritten Host einfuehrt, weitet die externe Oberflaeche des
  // Projekts lautlos - deshalb harter Bruch statt stiller Duldung.
  const seenHosts = new Set()
  for (const m of text.matchAll(URL_RE)) {
    seenHosts.add(m[1])
  }
  for (const host of seenHosts) {
    if (!ALLOWED_HOSTS.has(host)) {
      errors.push(
        `external host '${host}' is not in the allowlist (${[...ALLOWED_HOSTS].join(', ')})`,
      )
    }
  }

  return { ok: errors.length === 0, errors, sections }
}

/* ── CLI ─────────────────────────────────────────────────────────── */

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isMain) {
  const FILE = 'CHANGELOG.md'
  let text
  try {
    text = readFileSync(FILE, 'utf8')
  } catch (e) {
    console.error(`Cannot read ${FILE}: ${e.message}`)
    process.exit(2)
  }

  let knownTags
  try {
    // `^{}`-Eintraege sind die peeled-commit-Zeilen annotierter Tags und
    // duplizieren den normalen Tag. Wir nehmen nur die "flachen" refs.
    const raw = execFileSync('git', ['ls-remote', '--tags', 'origin'], { encoding: 'utf8' })
    knownTags = new Set()
    for (const line of raw.split('\n')) {
      if (!line || line.includes('^{}')) continue
      const ref = line.split('\t')[1]
      if (ref && ref.startsWith('refs/tags/v')) {
        knownTags.add(ref.slice('refs/tags/'.length))
      }
    }
  } catch (e) {
    console.error(`Cannot list tags on origin: ${e.message}`)
    process.exit(2)
  }

  const result = validateChangelog(text, knownTags)
  if (!result.ok) {
    for (const e of result.errors) console.error(`✗ ${e}`)
    process.exit(1)
  }
  console.log(
    `CHANGELOG.md looks sound: ${result.sections.length} section(s), ${knownTags.size} known tag(s).`,
  )
}