// SPDX-License-Identifier: Apache-2.0
/**
 * Winziger Markdown-Teilsatz für die Startseite.
 *
 * Warum nicht einfach HTML speichern und einsetzen: der Text reist mit der
 * Datei zu Leuten, die sie nicht gebaut haben - dieselbe Lage wie beim Logo
 * und bei den Verweisen in der Kopfzeile. Rohes HTML aus dem Datenblock in den
 * DOM zu schreiben wäre genau die Tür, die der SVG-Reiniger an anderer Stelle
 * zumacht.
 *
 * Deshalb wird hier **nicht geparst und eingesetzt, sondern gebaut**: die
 * Funktion liefert eine Baumstruktur aus einfachen Objekten, die die Ansicht
 * als Preact-Knoten rendert. Was nicht in dieser Liste steht, bleibt Text -
 * `<script>` in der Eingabe wird als `<script>` angezeigt und nicht ausgeführt.
 *
 * Unterstützt wird bewusst wenig, weil mehr niemand braucht, um zu erklären,
 * wofür ein Werkzeug da ist:
 *
 *   # ## ###     Überschriften
 *   - / *        Aufzählung
 *   1.           nummerierte Aufzählung
 *   > …          Hervorgehobener Absatz
 *   ---          Trennlinie
 *   **fett**  *kursiv*  `code`  [Text](url)
 */

import { safeUrl } from './links.js'

/* Inline-Regeln in der Reihenfolge, in der sie greifen. Code zuerst, damit
   Sternchen innerhalb von `…` nicht als Auszeichnung gelesen werden. */
const INLINE = [
  { re: /`([^`]+)`/, type: 'code' },
  { re: /\[([^\]]+)\]\(([^)\s]+)\)/, type: 'link' },
  { re: /\*\*([^*]+)\*\*/, type: 'strong' },
  { re: /\*([^*]+)\*/, type: 'em' },
]

/** Zerlegt eine Zeile in Textstücke und ausgezeichnete Stücke. */
export function inline(text) {
  let earliest = null
  for (const rule of INLINE) {
    const match = rule.re.exec(text)
    if (match && (!earliest || match.index < earliest.match.index)) {
      earliest = { rule, match }
    }
  }
  if (!earliest) return text ? [text] : []

  const { rule, match } = earliest
  const before = text.slice(0, match.index)
  const after = text.slice(match.index + match[0].length)
  const node =
    rule.type === 'link'
      ? { type: 'link', text: match[1], url: safeUrl(match[2]) }
      : { type: rule.type, text: match[1] }

  // Ein Verweis mit unbrauchbarer Adresse wird zu reinem Text, nicht zu einem
  // toten oder gefaehrlichen href.
  const usable = node.type !== 'link' || node.url ? node : node.text

  return [...(before ? [before] : []), usable, ...inline(after)]
}

/**
 * Blockstruktur. Liefert eine Liste von `{ type, ... }` - `heading`,
 * `paragraph`, `list`, `quote`, `rule`.
 */
export function parse(source) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let paragraph = []
  let list = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ type: 'paragraph', parts: inline(paragraph.join(' ')) })
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    blocks.push(list)
    list = null
  }
  const flush = () => {
    flushParagraph()
    flushList()
  }

  for (const raw of lines) {
    const line = raw.trim()

    if (!line) {
      flush()
      continue
    }

    if (/^-{3,}$/.test(line)) {
      flush()
      blocks.push({ type: 'rule' })
      continue
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ type: 'heading', level: heading[1].length, parts: inline(heading[2]) })
      continue
    }

    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      flush()
      blocks.push({ type: 'quote', parts: inline(quote[1]) })
      continue
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line)
    if (bullet || numbered) {
      flushParagraph()
      const ordered = Boolean(numbered)
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { type: 'list', ordered, items: [] }
      }
      list.items.push(inline((bullet ?? numbered)[1]))
      continue
    }

    /* Fortsetzungszeile. Ein umbrochener Listenpunkt gehoert an den vorigen
       Punkt und nicht in einen eigenen Absatz - handgeschriebenes Markdown ist
       fast immer weich umbrochen, und der Bruch faellt erst im Layout auf, wo
       der Text dann links neben dem Aufzaehlungszeichen steht. */
    if (list?.items.length) {
      const last = list.items.at(-1)
      const tail = last.at(-1)
      if (typeof tail === 'string') last[last.length - 1] = `${tail} ${line}`
      else last.push(' ' + line)
      continue
    }

    paragraph.push(line)
  }

  flush()
  return blocks
}
