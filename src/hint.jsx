// SPDX-License-Identifier: Apache-2.0
/**
 * Hinweiskästen mit Beispiel-Prompts.
 *
 * Die gebaute Datei erklärt sich damit selbst: an den Stellen, die man
 * typischerweise ändern will, steht ein Satz dazu, was diese Stelle erzeugt,
 * und ein fertiger Prompt, den man einem KI-Agenten geben kann, der an diesem
 * Werkzeug arbeitet. Wer die Datei bekommt, muss also weder das Repository noch
 * AGENTS.md gelesen haben, um zu wissen, wie er sie ändern lässt.
 *
 * Abschaltbar unter Einstellungen → Erscheinungsbild. Vor der Weitergabe an
 * reine Anwender gehört der Schalter aus - dort sind die Kästen nur Lärm.
 */
import { useState } from 'preact/hooks'

export function Hint({ show, id, tr }) {
  const [copied, setCopied] = useState(false)
  if (!show) return null

  const prompt = tr(`hint.${id}.prompt`)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Zwischenablage kann blockiert sein - der Text steht ja lesbar da.
    }
  }

  return (
    <aside class="hint">
      <p class="hint__text">{tr(`hint.${id}`)}</p>
      <div class="hint__prompt">
        <span class="hint__badge">{tr('hint.label')}</span>
        <q>{prompt}</q>
        <button class="hint__copy" onClick={copy} title={tr('hint.copy')}>
          {copied ? tr('hint.copied') : tr('hint.copy')}
        </button>
      </div>
    </aside>
  )
}
