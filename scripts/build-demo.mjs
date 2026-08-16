// SPDX-License-Identifier: Apache-2.0
/**
 * Baut die Schaudemos nach docs/demos/<slug>/index.html.
 *
 * Ein echtes Werkzeug entsteht, indem man src/domain.js austauscht *und* die
 * Vorgaben in DEFAULT_SETTINGS, DEFAULT_COLORS und DEFAULT_HOME anpasst (siehe
 * AGENTS.md). Genau das macht dieses Skript vorübergehend für jede Demo - und
 * schreibt die Quelldateien danach zurück, unabhängig davon, ob ein Build
 * durchlief.
 *
 *   npm run build:demo            # alle Demos
 *   npm run build:demo portfolio  # nur eine, beim Entwickeln
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEMOS } from './demos.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const domainPath = resolve(root, 'src/domain.js')
const appPath = resolve(root, 'src/app.jsx')
const indexPath = resolve(root, 'index.html')

const wanted = process.argv.slice(2)
const todo = wanted.length ? DEMOS.filter((d) => wanted.includes(d.slug)) : DEMOS
if (!todo.length) {
  console.error(`Unknown demo. Known: ${DEMOS.map((d) => d.slug).join(', ')}`)
  process.exit(1)
}

const originalDomain = readFileSync(domainPath, 'utf8')
const originalApp = readFileSync(appPath, 'utf8')
const originalIndex = readFileSync(indexPath, 'utf8')

/* Der Startseitentext enthaelt selbst Backticks (Inline-Code) und landet in
   einem Template-Literal - beide muessen escaped werden, sonst endet das
   Literal mitten im Satz. */
const forTemplate = (text) =>
  text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

try {
  for (const demo of todo) {
    console.log(`\n── ${demo.slug} ─────────────────────────────`)
    writeFileSync(domainPath, readFileSync(resolve(root, 'examples', demo.example), 'utf8'))

    let app = originalApp

    /* Die Oberflaechensprache steht als Konstante, nicht als Zeichenkette -
       eine deutsche Domaene mit englischen Knoepfen sieht nach Vorlage aus. */
    if (demo.locale) {
      const localePattern = /(\n  locale: )[^,\n]+/
      if (!localePattern.test(app)) throw new Error('DEFAULT_SETTINGS.locale not found in src/app.jsx')
      app = app.replace(localePattern, `$1'${demo.locale}'`)
    }

    for (const [key, value] of Object.entries(demo.settings)) {
      const pattern = new RegExp(`(\\n  ${key}: )'[^']*'`)
      if (!pattern.test(app)) throw new Error(`DEFAULT_SETTINGS.${key} not found in src/app.jsx`)
      app = app.replace(pattern, `$1'${value}'`)
    }

    /* Jede Demo hat ihren eigenen Farbraum. Ein Werkzeug, das sich vom
       naechsten nur durch die Ueberschrift unterscheidet, wirkt wie eine
       Vorlage - und genau das soll es nicht. */
    for (const [key, value] of Object.entries(demo.colors ?? {})) {
      const pattern = new RegExp(`(\\n  ${key}: )'#[0-9a-f]{6}'`)
      if (!pattern.test(app)) throw new Error(`DEFAULT_COLORS.${key} not found in src/app.jsx`)
      app = app.replace(pattern, `$1'${value}'`)
    }

    const homePattern = /const DEFAULT_HOME = `[\s\S]*?`\n/
    if (!homePattern.test(app)) throw new Error('DEFAULT_HOME not found in src/app.jsx')
    app = app.replace(homePattern, () => 'const DEFAULT_HOME = `' + forTemplate(demo.home) + '`\n')

    writeFileSync(appPath, app)

    // Der Fenstertitel steht statisch in index.html und wuerde sonst weiter
    // "Action items" sagen, waehrend die Demo etwas anderes zeigt.
    const index = originalIndex.replace(
      /<title>[^<]*<\/title>/,
      `<title>${demo.settings.title} — openToolbox</title>`,
    )
    if (index === originalIndex) throw new Error('<title> not found in index.html')
    writeFileSync(indexPath, index)

    const outDir = `docs/demos/${demo.slug}`
    execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], {
      cwd: root,
      stdio: 'inherit',
    })

    /* Die Portfolio-Demo lag frueher unter docs/demo/. Dorthin zeigen Verweise
       in READMEs, Wiki und aelteren Releases - die sollen nicht ins Leere
       laufen, nur weil eine zweite Demo dazugekommen ist. */
    if (demo.legacy) {
      rmSync(resolve(root, 'docs/demo'), { recursive: true, force: true })
      cpSync(resolve(root, outDir), resolve(root, 'docs/demo'), { recursive: true })
    }
  }
} finally {
  writeFileSync(domainPath, originalDomain)
  writeFileSync(appPath, originalApp)
  writeFileSync(indexPath, originalIndex)
}

console.log(
  `\n${todo.length} demo(s) written to docs/demos/ — domain.js, app.jsx and index.html restored.`,
)
