// SPDX-License-Identifier: Apache-2.0
/**
 * Geführte Erfassung: ein Durchlauf, mehrere Schritte, am Ende ein oder
 * mehrere neue Datensätze.
 *
 * Wozu, wenn es das Formular schon gibt: das Formular setzt voraus, dass man
 * das Werkzeug kennt. Wer eine Datei zugeschickt bekommt, um *eine* Sache zu
 * melden, soll nicht erst eine Tabelle, eine Seitenleiste und siebzehn Felder
 * sortieren müssen. Der Wizard fragt der Reihe nach und erklärt dabei.
 *
 * Wie alles hier ist er schemagetrieben - der `WIZARD`-Export aus domain.js
 * beschreibt ihn, gebaut wird nichts von Hand:
 *
 *   export const WIZARD = {
 *     title: 'Feststellung melden',
 *     intro: 'Kurz erklärt, worum es geht.',
 *     steps: [
 *       { id: 'basis',  label: 'Feststellung', fields: ['title', 'area'] },
 *       { id: 'detail', label: 'Details', fields: ['note'],
 *         when: (drafts) => drafts.records.severity !== 'low' },
 *       { id: 'bulk',   label: 'Mehrere auf einmal', type: 'csv' },
 *       { id: 'pruefen', type: 'review' },
 *     ],
 *     done: { message: 'Danke.', allowAnother: true },
 *   }
 *
 * Vier Schritttypen, mehr braucht es generisch nicht:
 *
 *   fields   Teilmenge der Schemafelder, gerendert mit derselben Maschine wie
 *            das Bearbeitungsformular - inklusive der Prüfregeln.
 *   csv      der vorhandene Import als Schritt. Zahlt in *denselben* Durchlauf
 *            ein: die Zeilen werden erst am Ende zusammen mit dem Entwurf
 *            angelegt, nicht schon beim Hochladen.
 *   review   Zusammenfassung, vollständig aus dem Schema erzeugt.
 *   done     Abschlusstext. Ohne eigenen Schritt aus `done` erzeugt.
 *
 * Mit mehreren Entitäten trägt ein Schritt zusätzlich `entity: '<key>'`. Ein
 * Durchlauf legt dann erst den Lieferanten an und danach seine Zertifikate -
 * die Entwürfe bekommen ihre Id gleich zu Beginn, damit ein Referenzfeld im
 * zweiten Schritt schon auf den Datensatz aus dem ersten zeigen kann.
 */

import { validateRecord, materialize, writableFields } from './entities.js'

/** Schritte, die unter dem aktuellen Stand tatsächlich vorkommen. */
export function visibleSteps(wizard, drafts) {
  return (wizard?.steps ?? []).filter((step) => {
    if (!step.when) return true
    try {
      return Boolean(step.when(drafts))
    } catch {
      // Eine Bedingung, die wirft, darf den Durchlauf nicht anhalten.
      return true
    }
  })
}

/** Entität eines Schritts - ohne Angabe die erste, also der Normalfall. */
export const stepEntity = (step, entityKeys) => step.entity ?? entityKeys[0]

/**
 * Beanstandungen eines Schritts. Ein `fields`-Schritt prüft nur die Felder, die
 * er selbst zeigt: die Regeln des Schemas gelten für den ganzen Datensatz, und
 * eine Regel über ein Feld aus Schritt vier gehört nicht in Schritt eins.
 */
export function stepObjections(step, entity, record, tr) {
  if (step.type || !step.fields?.length) return []
  const shown = new Set(step.fields)
  return validateRecord(entity.schema, materialize(entity, record), tr).filter((o) =>
    o.fields.some((key) => shown.has(key)),
  )
}

/**
 * Was am Ende wirklich angelegt wird. Ein Entwurf zählt nur, wenn sein
 * Titelfeld gefüllt ist - sonst hat der Durchlauf ihn nie berührt, etwa weil
 * nur der CSV-Schritt benutzt wurde.
 */
export function harvest(wizard, entities, entityKeys, drafts, bulk) {
  const out = {}
  const touched = new Set(
    visibleSteps(wizard, drafts)
      .filter((s) => !s.type && s.fields?.length)
      .map((s) => stepEntity(s, entityKeys)),
  )
  for (const key of entityKeys) {
    const rows = []
    if (touched.has(key)) {
      const draft = drafts[key]
      const titleField = entities[key].schema.titleField
      if (draft && String(draft[titleField] ?? '').trim()) rows.push(draft)
    }
    rows.push(...(bulk[key] ?? []))
    if (rows.length) out[key] = rows
  }
  return out
}

/**
 * Frische Entwürfe, einer je Entität, jeder mit seiner endgültigen Id. Die Id
 * sofort zu vergeben ist der Punkt: nur so kann ein Referenzfeld in einem
 * späteren Schritt auf den Datensatz aus einem früheren zeigen.
 */
export function freshDrafts(entities, entityKeys) {
  const drafts = {}
  for (const key of entityKeys) {
    const entity = entities[key]
    drafts[key] = { ...entity.emptyRecord(), [entity.schema.idField]: entity.uid() }
  }
  return drafts
}

/** Felder eines Schritts, berechnete herausgefiltert - die tippt niemand ein. */
export function stepFields(step, schema) {
  const wanted = new Set(step.fields ?? [])
  return writableFields(schema).filter((f) => wanted.has(f.key))
}
