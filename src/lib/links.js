// SPDX-License-Identifier: Apache-2.0
/**
 * Verweise in der Dateizeile: Symbol plus Ziel, das in einem neuen Tab öffnet.
 *
 * Gedacht für das, was neben dem Werkzeug liegt - das Repository, ein
 * Confluence-Bereich, ein Ticketboard, die Ablage im Intranet. Die Angaben
 * reisen mit der Datei, also gilt für sie dasselbe wie für das Logo: was hier
 * hineingeht, landet ungefragt bei jedem, der die Datei bekommt, und muss
 * entsprechend geprüft sein.
 *
 * Das Symbol läuft durch denselben Reiniger wie das Logo (lib/svg.js). Die
 * Adresse durch `safeUrl` - `javascript:` in einem href ist ein
 * Skriptaufruf mit einem Klick Abstand, und ein `data:`-Dokument oeffnet
 * fremdes HTML im Ursprung der Datei.
 */

export const MAX_LINKS = 5

/**
 * Gibt die Adresse zurueck, wenn sie sich gefahrlos in ein href schreiben
 * laesst, sonst einen leeren String. Ohne Schema wird https ergaenzt: wer
 * "intranet.firma.de/qm" eintippt, meint keine relative Datei.
 */
export function safeUrl(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return ''
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : 'https://' + text
  let parsed
  try {
    parsed = new URL(candidate)
  } catch {
    return ''
  }
  return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? parsed.href : ''
}

/**
 * Baut die gespeicherte Liste auf das auf, was sich anzeigen laesst: hoechstens
 * fuenf Eintraege, jeder mit brauchbarer Adresse. Ein Eintrag ohne Symbol ist
 * in Ordnung - die Dateizeile zeichnet dann ein neutrales Kettenglied.
 */
export function usableLinks(links) {
  if (!Array.isArray(links)) return []
  return links
    .map((link) => ({ ...link, url: safeUrl(link?.url) }))
    .filter((link) => link.url)
    .slice(0, MAX_LINKS)
}
