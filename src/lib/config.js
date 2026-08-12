// SPDX-License-Identifier: Apache-2.0
/**
 * Export und Import der Konfiguration ohne Nutzdaten.
 *
 * Zweck: eine einmal eingerichtete Anbindung auf weitere Werkzeuge übertragen,
 * ohne die Datensätze mitzuschleppen. Der API-Schlüssel bleibt bewusst außen
 * vor — eine Konfigurationsdatei wandert erfahrungsgemäß per Chat weiter.
 *
 * Beim Einlesen wird nicht blind zusammengeführt: übernommen wird nur, was in
 * den Voreinstellungen vorkommt und vom Typ her passt. Alles andere wird
 * verworfen und benannt.
 */

export const CONFIG_KIND = 'einzeldatei-anwendung/konfiguration'

export function exportConfig(settings) {
  return {
    kind: CONFIG_KIND,
    v: 1,
    exportiert: new Date().toISOString(),
    note: 'Contains no records and no API key.',
    settings,
  }
}

function sanitize(incoming, defaults, notes, path = '') {
  const out = {}

  for (const [key, fallback] of Object.entries(defaults)) {
    const value = incoming?.[key]
    const where = path ? `${path}.${key}` : key

    if (value === undefined) {
      out[key] = fallback
      continue
    }

    // dialect ist entweder null oder ein Objekt aus der Aushandlung.
    if (fallback === null) {
      out[key] = value && typeof value === 'object' ? value : null
      continue
    }

    if (fallback !== null && typeof fallback === 'object' && !Array.isArray(fallback)) {
      out[key] = sanitize(value, fallback, notes, where)
      continue
    }

    if (typeof value !== typeof fallback) {
      notes.push(`${where}: unexpected type, kept the default.`)
      out[key] = fallback
      continue
    }

    out[key] = value
  }

  const extra = Object.keys(incoming ?? {}).filter((k) => !(k in defaults))
  if (extra.length) notes.push(`${path || 'Configuration'}: ignored — ${extra.join(', ')}.`)

  return out
}

export function importConfig(raw, defaults) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('The file contains no readable JSON.')
  }

  const body = parsed?.settings ?? parsed
  if (!body || typeof body !== 'object') {
    throw new Error('There is no configuration in this file.')
  }
  if (parsed?.kind && parsed.kind !== CONFIG_KIND) {
    throw new Error(`This file belongs to "${parsed.kind}" and not here.`)
  }

  const notes = []
  return { settings: sanitize(body, defaults, notes), notes }
}
