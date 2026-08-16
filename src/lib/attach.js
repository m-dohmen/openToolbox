// SPDX-License-Identifier: Apache-2.0
/**
 * Anhänge an einem Datensatz.
 *
 * Audit- und Compliance-Werkzeuge brauchen immer den Nachweis: das Zertifikat,
 * den Rechnungsscan, den Screenshot. Bis hierher war ein Datensatz reiner Text.
 *
 * **Das Budget gehört zum Feature, nicht als Zugabe dazu.** Anhänge sprengen
 * genau das Versprechen, auf dem diese Bauform steht - eine Datei, die man per
 * Mail verschickt. Ohne harte Grenze und sichtbare Anzeige wäre das Feature ein
 * Schuss ins eigene Knie: die dritte hochgeladene PDF macht aus einem 200-KB-
 * Werkzeug einen 30-MB-Anhang, den kein Gateway mehr durchlässt, und gemerkt
 * hätte es niemand. Deshalb wird eine Überschreitung abgelehnt und nicht
 * geduldet.
 *
 * Abgelegt wird `{ name, type, size, data }` mit `data` als base64 im Datensatz
 * selbst - dieselbe Logik wie beim Rest: die Datei ist die Datenbank.
 */

/** Voreinstellung des Gesamtbudgets. Mail-Gateways werden ab etwa 10 MB zickig. */
export const DEFAULT_BUDGET_MB = 5

/** Eine einzelne Datei. Über diesem Wert ist es fast immer ein Versehen. */
export const MAX_ONE_BYTES = 4 * 1024 * 1024

export const mb = (bytes) => bytes / (1024 * 1024)

/**
 * Der abgelegte MIME-Typ wird nie zum Rendern benutzt, nur beim Herunterladen
 * mitgegeben. Trotzdem wird er auf ein harmloses Muster reduziert: ein
 * ausgedachter Typ in einer Datei, die herumgereicht wird, hat keinen Nutzen
 * und mögliche Nebenwirkungen.
 */
export const safeType = (raw) =>
  /^[\w.+-]+\/[\w.+-]+$/.test(String(raw ?? '')) ? String(raw) : 'application/octet-stream'

/** Dateiname ohne Pfadanteile und Steuerzeichen. */
export const safeName = (raw) => {
  const bare = String(raw ?? 'file').split(/[\\/]/).pop()
  // Steuerzeichen und alles, was in einem Dateinamen auf irgendeinem System
  // Sonderbedeutung hat. Der Name wird nur angezeigt und beim Herunterladen
  // vorgeschlagen, aber genau dort landet er wieder im Dateisystem.
  return bare.replace(/[\u0000-\u001f<>:"|?*]/g, '').trim().slice(0, 120) || 'file'
}

/** Liest eine Datei als base64 ein. Wirft mit lesbarer Begründung. */
export async function readAttachment(file) {
  if (file.size > MAX_ONE_BYTES) {
    throw new Error(`This file is ${mb(file.size).toFixed(1)} MB — the limit for one attachment is ${mb(MAX_ONE_BYTES)} MB.`)
  }
  const buffer = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < buffer.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, buffer.subarray(i, i + 0x8000))
  }
  return {
    name: safeName(file.name),
    type: safeType(file.type),
    size: file.size,
    data: btoa(binary),
  }
}

export const attachmentFields = (schema) => schema.fields.filter((f) => f.type === 'attachment')

/** Belegter Platz über alle Entitäten - Grundlage für die Anzeige und die Grenze. */
export function usedBytes(entities, recordsByEntity) {
  let total = 0
  for (const [key, entity] of Object.entries(entities)) {
    const fields = attachmentFields(entity.schema)
    if (!fields.length) continue
    for (const record of recordsByEntity[key] ?? []) {
      for (const f of fields) {
        const value = record[f.key]
        if (value?.data) total += value.size ?? value.data.length * 0.75
      }
    }
  }
  return total
}

/** Hat diese Domäne überhaupt Anhänge? Sonst gibt es die Anzeige nicht. */
export const hasAttachments = (entities) =>
  Object.values(entities).some((e) => attachmentFields(e.schema).length > 0)

/** Blob für den Download. Bewusst nie im Dokument gerendert, immer gespeichert. */
export function toBlob(attachment) {
  const binary = atob(attachment.data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: safeType(attachment.type) })
}
