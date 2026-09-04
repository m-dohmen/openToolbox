#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * CI-Waechter fuer Testsuiten-Drift (OPEN-124).
 *
 * Drei Quellen fuer Drift, jeder Verstoss faellt den Job:
 *
 *   1. Eine ausgewaehlte Doku-Stelle (README, README.de, _produkt.md)
 *      nennt die Suiten in einer anderen Reihenfolge als scripts.test.
 *   2. Eine in der Doku genannte Suite hat keinen Eintrag in scripts.test.
 *   3. Eine Suite aus scripts.test fehlt in der ausgewaehlten Doku-Stelle.
 *
 * CONTRIBUTING.md fuehrt die Suiten als Prosa, nicht als Liste; die
 * Reihenfolge dort folgt einer konzeptionellen Gruppierung und ist
 * bewusst nicht 1:1 die scripts.test-Reihenfolge. Daher pruefen wir dort
 * nur Vollstaendigkeit ("alle zwölf Suiten kommen vor"), nicht die
 * Reihenfolge. _produkt.md Zeile 39 fuehrt die Suiten dagegen explizit
 * in Klammern auf, dort wird auch die Reihenfolge geprueft.
 *
 * validateSuiteDrift ist die reine Pruefroutine und wird von
 * test/suite-drift.mjs gegen synthetische Eingaben gefahren. Der CLI-
 * Wrapper liest die fuenf Dateien aus dem Repo, uebergibt sie an die
 * reine Routine und beendet mit Exit 1 beim ersten Verstoss.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SCRIPTS_TEST_RE = /node\s+test\/([\w-]+)\.mjs/g
/* Die Bulletliste in README.md/README.de.md laesst das `test/<name>.mjs`
 * optional in Backticks stehen ("- `test/views.mjs` — ..."), mal ohne
 * ("- test/views.mjs — ..."). Wir nehmen beides. */
const README_TEST_RE = /-\s+`?test\/([\w-]+)\.mjs`?/g
const PRODUKT_PAREN_RE = /\(zwölf Suiten:\s+([\w\-, ]+?)\)/g

/* Eigene Suite — wird aus dem Drift-Vergleich ausgenommen. Die Doku
 * fuehrt die Suiten auf, die *etwas pruefen*; der Drift-Waechter
 * selbst ist Infrastruktur, nicht Inhalt. Wuerden wir ihn mitzaehlen,
 * muesste die Doku von jetzt auf gleich "dreizehn" sagen — was die
 * OPEN-124-Spec ausdruecklich nicht vorsieht (sie sagt: keine Korrektur
 * der fuenf Doku-Stellen). */
const SELF_SUITE = 'suite-drift'

/* Welche Stellen je Datei auf Reihenfolge geprueft werden (und welche
 * nur auf Vollstaendigkeit). Die Reihenfolge der Map ist die
 * Reihenfolge der Diagnose-Zeilen bei Verstoss. */
const SOURCES = [
  {
    file: 'README.md',
    kind: 'ordered-list',
    /* Bulletliste "- test/<name>.mjs" aus dem "## Testing"-Abschnitt. */
    extract(text) {
      return reMatch(text, README_TEST_RE)
    },
  },
  {
    file: 'README.de.md',
    kind: 'ordered-list',
    /* Dasselbe in der deutschen Variante unter "## Testen". */
    extract(text) {
      return reMatch(text, README_TEST_RE)
    },
  },
  {
    file: 'CONTRIBUTING.md',
    kind: 'set-only',
    /* Prosa unter "## Before opening a pull request". Reihenfolge wird
     * bewusst nicht erzwungen, nur Vollstaendigkeit. */
    aliases: {
      'prompts-metrics': /\bgenerated build prompts\b/,
      'actions-delete-guard': /\breference guard\b/,
      'timezone': /\blocal-calendar due dates\b/,
      'domain-swap-crash': /\bcrash-safe fixture swap\b/,
      'timezone-examples': /\bevery example domain\b/,
      'views': /\bsaved-views\b/,
      'board': /\bkanban-board\b/,
      'charts': /\bchart math\b/,
      'changelog': /\bCHANGELOG-order\b/,
      'smoke': /\bend-to-end\b/,
      'multi-entity': /\bend-to-end\b/,
      'demos': /\bevery built demo\b/,
    },
    extract(text) {
      const found = []
      const seen = new Set()
      for (const [suite, re] of Object.entries(this.aliases)) {
        if (!seen.has(suite) && re.test(text)) {
          seen.add(suite)
          found.push(suite)
        }
      }
      return found
    },
  },
  {
    file: '.multica/agents/_produkt.md',
    kind: 'ordered-list',
    /* Parensliste "(zwölf Suiten: a, b, c, ...)" auf Zeile 39. */
    extract(text) {
      const out = []
      let m
      while ((m = PRODUKT_PAREN_RE.exec(text)) !== null) {
        for (const part of m[1].split(',')) {
          const name = part.trim()
          if (name) out.push(name)
        }
      }
      return out
    },
  },
  {
    file: '.multica/agents/entwickler.md',
    kind: 'count-only',
    /* "Alle zwölf Suiten" als Zaehl-Behauptung. Es gibt keine Liste,
     * also wird nur die Anzahl gegen die Laenge von scripts.test
     * gehalten. Wer "zwölf" durch eine andere Zahl ersetzt, faellt
     * hier durch. */
    extract() {
      return []
    },
  },
]

const GERMAN_NUMBER_WORDS = {
  eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6,
  sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12,
  dreizehn: 13, vierzehn: 14, fünfzehn: 15,
}

function reMatch(text, re) {
  const out = []
  let m
  while ((m = re.exec(text)) !== null) out.push(m[1])
  return out
}

function parseScriptsTest(text) {
  const suites = []
  let m
  while ((m = SCRIPTS_TEST_RE.exec(text)) !== null) suites.push(m[1])
  return suites.filter((name) => name !== SELF_SUITE)
}

function readCountClaim(text) {
  /* "alle zwölf Suiten" / "Alle zwölf Testsuiten" — wir nehmen die
   * erste Zahl, die als deutsches Zahlwort vor "Suiten" steht. Wer
   * die Zahl in Ziffern schreibt ("12 Suiten"), fangen wir auch. */
  const re = /\b(\d+|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn)\b[\s\u00A0-]*Suiten/i
  const m = text.match(re)
  if (!m) return null
  const raw = m[1]
  return /^\d+$/.test(raw) ? Number(raw) : (GERMAN_NUMBER_WORDS[raw] ?? null)
}

/**
 * Prueft, ob die in den Doku-Stellen genannten Suiten zu scripts.test
 * passen. Reihenfolge wird fuer die Stellen mit expliziter Liste
 * erzwungen (README.md, README.de.md, _produkt.md). Fuer Prosa-Stellen
 * (CONTRIBUTING.md) und Stellen ohne Liste (entwickler.md) wird nur die
 * Vollstaendigkeit bzw. die Zaehl-Behauptung gehalten.
 *
 * @param {string} packageJsonText  Inhalt von package.json (scripts.test wird geparst).
 * @param {{[file: string]: string}} fileContents  Inhalte der fuenf geprueften Dateien.
 * @returns {{ ok: boolean, errors: string[], scriptsTest: string[] }}
 */
export function validateSuiteDrift(packageJsonText, fileContents) {
  const errors = []
  const scriptsTest = parseScriptsTest(packageJsonText)
  const scriptsSet = new Set(scriptsTest)

  if (scriptsTest.length === 0) {
    errors.push('package.json: scripts.test enthaelt keine Suite-Aufrufe')
    return { ok: false, errors, scriptsTest }
  }

  for (const source of SOURCES) {
    const text = fileContents[source.file] ?? ''
    const found = source.extract(text)
    const foundSet = new Set(found)

    if (source.kind === 'ordered-list') {
      /* (2) Suite in der Doku, aber nicht in scripts.test. */
      for (const name of found) {
        if (!scriptsSet.has(name)) {
          errors.push(
            `${source.file}: suite '${name}' is not in scripts.test`,
          )
        }
      }

      /* (3) Suite aus scripts.test fehlt in der Doku. */
      for (const name of scriptsTest) {
        if (!foundSet.has(name)) {
          errors.push(`${source.file}: missing suite '${name}'`)
        }
      }

      /* (1) Reihenfolge weicht ab. */
      for (let i = 0; i < Math.min(found.length, scriptsTest.length); i++) {
        if (found[i] !== scriptsTest[i]) {
          errors.push(
            `${source.file}:position ${i + 1} erwartet=${scriptsTest[i]} gefunden=${found[i]}`,
          )
          /* Eine Verschiebung wirkt ab ihrer Position; eine Diagnose
           * pro Verschiebung reicht, danach steht der Rest eine Stelle
           * daneben. */
          break
        }
      }
    } else if (source.kind === 'set-only') {
      /* (3) Vollstaendigkeit ohne Reihenfolge. Pro Suite gilt: mindestens
       * ein Alias matcht. */
      for (const name of scriptsTest) {
        if (!foundSet.has(name)) {
          errors.push(`${source.file}: suite '${name}' is not mentioned`)
        }
      }
      /* (2) Der Rueckweg — in der Doku gefundene Suite, die nicht in
       * scripts.test steht. */
      for (const name of found) {
        if (!scriptsSet.has(name)) {
          errors.push(
            `${source.file}: suite '${name}' is not in scripts.test`,
          )
        }
      }
    } else if (source.kind === 'count-only') {
      const claimed = readCountClaim(text)
      if (claimed === null) {
        errors.push(`${source.file}: no number word found before "Suiten"`)
      } else if (claimed !== scriptsTest.length) {
        errors.push(
          `${source.file}: count claim ${claimed} does not match scripts.test length ${scriptsTest.length}`,
        )
      }
    }
  }

  return { ok: errors.length === 0, errors, scriptsTest }
}

/* ── CLI ─────────────────────────────────────────────────────────── */

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isMain) {
  let pkgText
  try {
    pkgText = readFileSync('package.json', 'utf8')
  } catch (e) {
    console.error(`Cannot read package.json: ${e.message}`)
    process.exit(2)
  }

  const fileContents = {}
  for (const source of SOURCES) {
    try {
      fileContents[source.file] = readFileSync(source.file, 'utf8')
    } catch (e) {
      console.error(`Cannot read ${source.file}: ${e.message}`)
      process.exit(2)
    }
  }

  const result = validateSuiteDrift(pkgText, fileContents)
  if (!result.ok) {
    for (const e of result.errors) console.error(`\u2717 ${e}`)
    process.exit(1)
  }
  console.log(
    `Suite drift check passed: ${result.scriptsTest.length} suite(s) in scripts.test, all five doc sources in sync.`,
  )
}