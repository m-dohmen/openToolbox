// SPDX-License-Identifier: Apache-2.0
/**
 * Ein Befehl, der alles prüft, was vor einem Pull Request stimmen muss.
 *
 * Es gab die Regel „wenn die Änderung die Demos berührt, baue sie neu" — und
 * genau daran ist die Kette gescheitert: eine Änderung an `src/` berührt die
 * Demos **immer**, weil jede Demo die gesamte Anwendung einbettet. Wer das
 * einschätzen muss, schätzt es irgendwann falsch ein.
 *
 * Deshalb gibt es hier nichts zu entscheiden. Der Befehl baut, prüft, baut die
 * Demos samt Prompts neu und schlägt fehl, wenn danach irgendetwas im
 * Arbeitsbaum ungespeichert ist.
 *
 *   npm run verify
 */
import { execFileSync } from 'node:child_process'

const run = (cmd, args) => {
  process.stdout.write(`\n── ${cmd} ${args.join(' ')}\n`)
  execFileSync(cmd, args, { stdio: 'inherit' })
}

run('npm', ['run', 'build'])
run('npm', ['test'])
run('npm', ['run', 'build:demo'])

const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()
if (dirty) {
  console.error(
    '\nFEHLER: Der Arbeitsbaum ist nach dem Bauen nicht sauber.\n' +
      'Das heißt fast immer: die erzeugten Demos oder Prompts wurden nicht mit\n' +
      'committet. Genau daran scheitert sonst die CI.\n\n' +
      dirty +
      '\n\nBeheben: git add -A && git commit\n',
  )
  process.exit(1)
}

console.log('\nAlles grün: Build, vier Testsuiten, Demos und Prompts aktuell, Arbeitsbaum sauber.')
