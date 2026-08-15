// SPDX-License-Identifier: Apache-2.0
/**
 * Baut die Schaudemo nach docs/demo/index.html.
 *
 * Ein echtes Werkzeug entsteht, indem man src/domain.js austauscht *und* die
 * Vorgaben in DEFAULT_SETTINGS anpasst (siehe AGENTS.md). Genau das macht
 * dieses Skript vorübergehend, damit die Demo nicht "Action items" heißt,
 * während sie Projekte zeigt - und schreibt beide Dateien danach zurück,
 * unabhängig davon, ob der Build durchlief.
 *
 *   npm run build:demo
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const domainPath = resolve(root, 'src/domain.js')
const appPath = resolve(root, 'src/app.jsx')
const indexPath = resolve(root, 'index.html')
const examplePath = resolve(root, 'examples/portfolio.domain.js')

const DEMO = {
  title: 'Project portfolio',
  subtitle: 'Engagements, milestones and where the budget stands',
  fileStem: 'project-portfolio',
  version: '2.1',
}

const originalDomain = readFileSync(domainPath, 'utf8')
const originalApp = readFileSync(appPath, 'utf8')
const originalIndex = readFileSync(indexPath, 'utf8')

try {
  writeFileSync(domainPath, readFileSync(examplePath, 'utf8'))

  let app = originalApp
  for (const [key, value] of Object.entries(DEMO)) {
    const pattern = new RegExp(`(\\n  ${key}: )'[^']*'`)
    if (!pattern.test(app)) throw new Error(`DEFAULT_SETTINGS.${key} not found in src/app.jsx`)
    app = app.replace(pattern, `$1'${value}'`)
  }
  writeFileSync(appPath, app)

  // Der Fenstertitel steht statisch in index.html und wuerde sonst weiter
  // "Action items" sagen, waehrend die Demo Projekte zeigt.
  const index = originalIndex.replace(
    /<title>[^<]*<\/title>/,
    `<title>${DEMO.title} — openToolbox</title>`,
  )
  if (index === originalIndex) throw new Error('<title> not found in index.html')
  writeFileSync(indexPath, index)

  execFileSync('npx', ['vite', 'build', '--outDir', 'docs/demo'], { cwd: root, stdio: 'inherit' })
} finally {
  writeFileSync(domainPath, originalDomain)
  writeFileSync(appPath, originalApp)
  writeFileSync(indexPath, originalIndex)
}

console.log('\nDemo written to docs/demo/index.html — domain.js, app.jsx and index.html restored.')
