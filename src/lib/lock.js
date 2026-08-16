// SPDX-License-Identifier: Apache-2.0
/**
 * Schutz der Einstellungen gegen versehentliche Änderung.
 *
 * Das ist ausdrücklich **keine Zugriffskontrolle**. Wer die Datei hat, hat auch
 * den Code: der Sperreintrag lässt sich aus dem Datenblock löschen, und schon
 * sind die Einstellungen wieder offen. Genau wie bei Rollen und Ansichten wäre
 * alles andere in einer lokal laufenden Datei nur Fassade - siehe README,
 * Abschnitt zur Verschlüsselung.
 *
 * Wogegen es hilft: der Fachanwender, der die Datei zum Arbeiten bekommt, die
 * Einstellungsseite öffnet und im Vorbeigehen den Endpunkt, die Farben oder
 * den Dateinamen verstellt. Dagegen genügt eine Hürde, und "123" ist als
 * Passwort völlig in Ordnung.
 *
 * Trotzdem wird nicht das Passwort selbst abgelegt, sondern ein gesalzener
 * SHA-256-Abdruck. Nicht weil das den Schutz stärker machte, sondern weil in
 * einer Datei, die herumgereicht wird, kein Passwort im Klartext stehen soll -
 * Menschen benutzen dasselbe Wort erfahrungsgemäß auch anderswo.
 */

const enc = new TextEncoder()

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function digest(salt, password) {
  const data = enc.encode(`${salt}:${password}`)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

/** Erzeugt den Sperreintrag, der mit der Datei gespeichert wird. */
export async function makeLock(password) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(8)))
  return { salt, hash: await digest(salt, password) }
}

/** Prüft eine Eingabe gegen den gespeicherten Eintrag. */
export async function checkLock(lock, password) {
  if (!lock?.salt || !lock?.hash) return false
  return (await digest(lock.salt, password)) === lock.hash
}
