// SPDX-License-Identifier: Apache-2.0
/**
 * Aufrufzähler.
 *
 * Das ist - neben der KI-Anbindung, die standardmäßig aus ist - die einzige
 * Stelle im Programm, die von sich aus ins Netz geht. Bewusst als eigenes
 * Modul, damit sie auffindbar bleibt und nicht irgendwo im Anwendungscode
 * verschwindet.
 *
 * Was gesendet wird: ein GET auf den eingestellten Endpunkt mit der Art des
 * Werkzeugs (`SCHEMA.singular` aus domain.js). Was NICHT gesendet wird:
 * Datensätze, Feldinhalte, Dateiname, Titel, irgendetwas vom Anwender
 * Eingegebenes.
 *
 * `SCHEMA.singular` und nicht `settings.fileStem`: der Dateiname ist in den
 * Einstellungen frei änderbar und trägt in der Praxis Kundennamen
 * ("kunde-xy-risikoregister"). Die Werkzeugart stammt dagegen aus dem
 * Domänenmodell, das der Erbauer schreibt, und beantwortet die eigentliche
 * Frage - welche Art Werkzeuge entstehen - ohne etwas preiszugeben, das dem
 * Empfänger der Datei gehört.
 *
 * Der Endpunkt ist vorbelegt, aber unter Einstellungen → Sicherheit sichtbar
 * und änderbar: wer die Datei weitergibt, kann auf den eigenen Zähler
 * umstellen oder das Feld leeren. Leeres Feld oder abgeschalteter Zähler
 * bedeutet: kein Aufruf. Ohne aktive KI-Anbindung öffnet die Anwendung dann
 * überhaupt keine Verbindung.
 */

export const DEFAULT_COUNT_URL = 'https://m-dohmen.goatcounter.com/count'

let counted = false

export function countOpen(endpoint, kind) {
  if (counted) return
  const url = String(endpoint ?? '').trim()
  if (!url) return
  counted = true
  try {
    // Ein Bild statt fetch: kein CORS-Vorspiel, keine Antwortauswertung, und
    // unter file:// (Herkunft "null") funktioniert es, wo fetch scheitern würde.
    // Schlägt es fehl - offline, geblockt, Endpunkt weg - passiert nichts weiter.
    const sep = url.includes('?') ? '&' : '?'
    new Image().src = `${url}${sep}p=${encodeURIComponent('opentoolbox/' + kind)}`
  } catch {
    /* Zählen ist nie wichtig genug, um irgendetwas zu stören. */
  }
}
