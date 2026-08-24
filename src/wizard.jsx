// SPDX-License-Identifier: Apache-2.0
/**
 * Die geführte Erfassung. Aufbau und Regeln stehen in lib/wizard.js, hier ist
 * nur die Darstellung.
 *
 * Ein Durchlauf sammelt zwei Dinge und legt sie erst am Ende an: einen Entwurf
 * je Entität aus den `fields`-Schritten und beliebig viele Zeilen aus den
 * `csv`-Schritten. Das ist der Grund, warum der Import hier nicht sofort
 * schreibt - wer im vierten Schritt abbricht, soll nichts hinterlassen haben.
 */
import { useMemo, useState } from 'preact/hooks'
import { fromCsv } from './lib/csv.js'
import { coerceField, materialize, fieldValue, validateRecord } from './lib/entities.js'
import {
  visibleSteps,
  stepEntity,
  stepObjections,
  harvest,
  freshDrafts,
  stepFields,
} from './lib/wizard.js'

export function WizardView({
  wizard,
  entities,
  entityKeys,
  recordsByEntity,
  FieldInput,
  tr,
  onFinish,
  onCancel,
  intake,
}) {
  const [drafts, setDrafts] = useState(() => freshDrafts(entities, entityKeys))
  const [bulk, setBulk] = useState({})
  const [at, setAt] = useState(0)
  const [touched, setTouched] = useState({})
  const [done, setDone] = useState(null)
  const [note, setNote] = useState('')

  const steps = useMemo(() => visibleSteps(wizard, drafts), [wizard, drafts])
  const step = steps[Math.min(at, steps.length - 1)]
  const entityKey = stepEntity(step, entityKeys)
  const entity = entities[entityKey]

  /* Der Vorschau- und der Abschlussschritt zählen mit, damit die Anzeige
     "Schritt 2 von 4" das meint, was der Nutzer sieht. */
  const total = steps.length

  /* Referenzfelder muessen die Entwuerfe dieses Durchlaufs mit anbieten, nicht
     nur den gespeicherten Bestand - sonst kann Schritt zwei nicht auf den
     Datensatz aus Schritt eins zeigen, was der halbe Sinn der Sache ist. */
  const options = useMemo(() => {
    const merged = { ...recordsByEntity }
    for (const key of entityKeys) {
      const draft = drafts[key]
      const titleField = entities[key].schema.titleField
      if (draft && String(draft[titleField] ?? '').trim()) {
        merged[key] = [...(recordsByEntity[key] ?? []), draft]
      }
    }
    return merged
  }, [recordsByEntity, drafts, entityKeys, entities])

  const objections = step ? stepObjections(step, entity, drafts[entityKey], tr) : []
  const shown = objections.filter((o) => o.fields.some((k) => touched[k]))

  const change = (key, value) => {
    setTouched((s) => ({ ...s, [key]: true }))
    setDrafts((prev) => ({ ...prev, [entityKey]: { ...prev[entityKey], [key]: value } }))
  }

  function next() {
    if (objections.length) {
      setTouched((s) => ({
        ...s,
        ...Object.fromEntries(objections.flatMap((o) => o.fields).map((k) => [k, true])),
      }))
      return
    }
    setAt((i) => Math.min(i + 1, total - 1))
  }

  function finish() {
    const created = harvest(wizard, entities, entityKeys, drafts, bulk)
    const count = Object.values(created).reduce((n, rows) => n + rows.length, 0)
    onFinish(created, note.trim())
    setDone(count)
  }

  function again() {
    setDrafts(freshDrafts(entities, entityKeys))
    setBulk({})
    setTouched({})
    setNote('')
    setAt(0)
    setDone(null)
  }

  /* ── Abschluss ─────────────────────────────────────────────── */

  if (done !== null) {
    return (
      <div class="wizard">
        <div class="wizard__inner wizard__inner--done">
          <p class="wizard__badge">{tr('wizard.doneBadge')}</p>
          <h2>{wizard.done?.message ?? tr('wizard.doneDefault')}</h2>
          <p class="wizard__lead">{tr('wizard.doneCount', done)}</p>
          <div class="wizard__foot">
            {wizard.done?.allowAnother !== false && (
              <button class="btn btn--primary" onClick={again}>
                {tr('wizard.another')}
              </button>
            )}
            {!intake && (
              <button class="btn btn--quiet" onClick={onCancel}>
                {tr('wizard.toList')}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── Laufender Durchlauf ───────────────────────────────────── */

  return (
    <div class="wizard">
      <div class="wizard__inner">
        <p class="wizard__badge">{tr('wizard.stepOf', at + 1, total)}</p>
        <h2>{wizard.title ?? tr('wizard.title')}</h2>
        {at === 0 && wizard.intro && <p class="wizard__lead">{wizard.intro}</p>}

        <ol class="wizard__rail" aria-label={tr('wizard.progress')}>
          {steps.map((s, i) => (
            <li key={s.id ?? i} data-state={i < at ? 'past' : i === at ? 'now' : 'future'}>
              <span>{s.label ?? tr(`wizard.type.${s.type ?? 'fields'}`)}</span>
            </li>
          ))}
        </ol>

        <div class="wizard__body">
          {step?.type === 'review' ? (
            <ReviewStep
              wizard={wizard}
              entities={entities}
              entityKeys={entityKeys}
              drafts={drafts}
              bulk={bulk}
              tr={tr}
            />
          ) : step?.type === 'csv' ? (
            <CsvStep
              entity={entity}
              entityKey={entityKey}
              entities={entities}
              recordsByEntity={recordsByEntity}
              rows={bulk[entityKey] ?? []}
              onRows={(rows) => setBulk((s) => ({ ...s, [entityKey]: rows }))}
              tr={tr}
            />
          ) : (
            stepFields(step ?? {}, entity.schema).map((f) => (
              <div class="field" key={f.key}>
                <label for={'f-' + f.key}>{f.label}</label>
                <FieldInput
                  field={f}
                  record={drafts[entityKey]}
                  entity={entity}
                  entities={entities}
                  recordsByEntity={options}
                  onChange={change}
                  tr={tr}
                />
                {shown
                  .filter((o) => o.fields.includes(f.key))
                  .map((o) => (
                    <p class="field__objection" key={o.message}>{o.message}</p>
                  ))}
              </div>
            ))
          )}
        </div>

        {step?.type === 'review' && (
          <div class="field">
            <label for="wizard-note">{tr('wizard.noteLabel')}</label>
            <textarea
              id="wizard-note"
              rows="2"
              placeholder={tr('wizard.notePlaceholder')}
              value={note}
              onInput={(e) => setNote(e.currentTarget.value)}
            />
          </div>
        )}

        {shown.length > 0 && (
          <p class="wizard__objections" role="status">
            {tr('validation.blocked', shown.length)}
          </p>
        )}

        <div class="wizard__foot">
          {at > 0 && (
            <button class="btn btn--quiet" onClick={() => setAt((i) => i - 1)}>
              {tr('wizard.back')}
            </button>
          )}
          {at < total - 1 ? (
            <button class="btn btn--primary" onClick={next}>
              {tr('wizard.next')}
            </button>
          ) : (
            <button class="btn btn--primary" onClick={finish}>
              {tr('wizard.finish')}
            </button>
          )}
          {!intake && (
            <button class="btn btn--quiet" onClick={onCancel}>
              {tr('common.cancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Massenerfassung als Schritt. Zuordnung wie beim regulären Import - nur wird
 * hier nichts geschrieben, sondern gesammelt, bis der Durchlauf abgeschlossen
 * ist.
 */
function CsvStep({ entity, entityKey, entities, recordsByEntity, rows, onRows, tr }) {
  const [state, setState] = useState(null)
  const schema = entity.schema

  async function read(file) {
    if (!file) return
    try {
      const parsed = fromCsv(await file.text())
      const mapping = {}
      const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
      parsed.columns.forEach((column, index) => {
        const match = schema.fields.find(
          (f) => f.type !== 'computed' && (norm(f.label) === norm(column) || norm(f.key) === norm(column)),
        )
        if (match) mapping[index] = match.key
      })
      setState({ ...parsed, mapping, problems: [] })
    } catch (err) {
      setState({ columns: [], rows: [], mapping: {}, problems: [err.message] })
    }
  }

  function take() {
    const problems = []
    const built = []
    const mapped = Object.entries(state.mapping).filter(([, key]) => key)
    state.rows.forEach((cells, i) => {
      const where = tr('import.row', i + 2)
      const record = { ...entity.emptyRecord(), [schema.idField]: entity.uid() }
      for (const [index, key] of mapped) {
        const raw = cells[Number(index)]
        if (raw === undefined || String(raw).trim() === '') continue
        const outcome = coerceField(schema, key, raw, { entities, recordsByEntity })
        if (!outcome.ok) {
          problems.push(tr(`actions.${outcome.code}`, where, ...outcome.params))
          continue
        }
        record[key] = outcome.value
      }
      if (!String(record[schema.titleField] ?? '').trim()) {
        problems.push(tr('import.needsTitle', where, schema.titleField))
        return
      }
      /* Dieselben Regeln wie beim regelmaessigen Import. Eine Zeile, die dort
         abgewiesen wuerde, darf ueber den Wizard keinen Schleichweg in den
         Bestand bekommen - der Schritt ist der Import, nicht eine Kopie
         ohne Pruefung. */
      const objections = validateRecord(schema, materialize(entity, record), tr)
      if (objections.length) {
        for (const o of objections) problems.push(tr('validation.rowRejected', where, o.message))
        return
      }
      built.push(record)
    })
    onRows(built)
    setState((s) => ({ ...s, problems, taken: built.length }))
  }

  return (
    <div class="wizard__csv">
      <p class="wizard__lead">{tr('wizard.csvLead', schema.plural)}</p>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          read(e.currentTarget.files?.[0])
          e.currentTarget.value = ''
        }}
      />

      {state && state.columns.length > 0 && (
        <>
          <table class="import__map">
            <thead>
              <tr>
                <th>{tr('import.columnHead')}</th>
                <th>{tr('import.fieldHead')}</th>
              </tr>
            </thead>
            <tbody>
              {state.columns.map((column, index) => (
                <tr key={index}>
                  <td>{column}</td>
                  <td>
                    <select
                      value={state.mapping[index] ?? ''}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          mapping: { ...s.mapping, [index]: e.currentTarget.value },
                        }))
                      }
                    >
                      <option value="">{tr('import.ignore')}</option>
                      {schema.fields
                        .filter((f) => f.type !== 'computed' && f.key !== schema.idField)
                        .map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button class="btn" onClick={take}>
            {tr('wizard.csvTake')}
          </button>
        </>
      )}

      {rows.length > 0 && <p class="note note--ok">{tr('wizard.csvHeld', rows.length)}</p>}
      {state?.problems?.length > 0 && (
        <ul class="import__problems">
          {state.problems.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Zusammenfassung, vollständig aus dem Schema erzeugt - nichts zu konfigurieren. */
function ReviewStep({ wizard, entities, entityKeys, drafts, bulk, tr }) {
  const created = harvest(wizard, entities, entityKeys, drafts, bulk)
  const keys = Object.keys(created)

  if (!keys.length) return <p class="wizard__lead">{tr('wizard.reviewEmpty')}</p>

  return (
    <div class="wizard__review">
      {keys.map((key) => {
        const entity = entities[key]
        const schema = entity.schema
        return (
          <section key={key}>
            <p class="label">{tr('wizard.reviewCount', created[key].length, schema.plural)}</p>
            {created[key].slice(0, 5).map((record) => (
              <dl key={record[schema.idField]}>
                {schema.fields
                  .filter((f) => !isEmpty(fieldValue(entity, materialize(entity, record), f.key)))
                  .map((f) => (
                    <div key={f.key}>
                      <dt>{f.label}</dt>
                      <dd>{String(fieldValue(entity, materialize(entity, record), f.key))}</dd>
                    </div>
                  ))}
              </dl>
            ))}
            {created[key].length > 5 && (
              <p class="note">{tr('wizard.reviewMore', created[key].length - 5)}</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '' || v === 0
