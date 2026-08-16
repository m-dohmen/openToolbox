// SPDX-License-Identifier: Apache-2.0
/**
 * Auswahldialog für den Abgleich zweier Dateien. Die Vergleichslogik steht in
 * lib/merge.js, hier wird nur entschieden.
 *
 * Eine Vorgabe ist bewusst so gesetzt und nicht anders: **Gelöschtes wird nicht
 * vorausgewählt.** Neu und Geändert sind angehakt, weil das der Grund ist, aus
 * dem jemand zwei Dateien zusammenführt. Ein Datensatz, den es hier gibt und in
 * der eingelesenen Datei nicht, kann aber genauso gut bedeuten, dass der andere
 * eine ältere Kopie hatte - stillschweigend zu löschen wäre der einzige
 * Schritt in diesem Dialog, der Daten vernichtet.
 */
import { useMemo, useState } from 'preact/hooks'

export function MergeDialog({ diff, entities, entityKeys, fileName, tr, onCancel, onApply }) {
  const [picks, setPicks] = useState(() => {
    const initial = {}
    for (const key of entityKeys) {
      const group = diff.byEntity[key]
      initial[key] = {
        added: new Set(group.added.map((x) => x.id)),
        changed: new Set(group.changed.map((x) => x.id)),
        removed: new Set(),
      }
    }
    return initial
  })

  const toggle = (entityKey, group, id) =>
    setPicks((prev) => {
      const set = new Set(prev[entityKey][group])
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, [entityKey]: { ...prev[entityKey], [group]: set } }
    })

  const toggleAll = (entityKey, group, ids, on) =>
    setPicks((prev) => ({
      ...prev,
      [entityKey]: { ...prev[entityKey], [group]: on ? new Set(ids) : new Set() },
    }))

  const chosen = useMemo(
    () =>
      entityKeys.reduce(
        (n, key) =>
          n + picks[key].added.size + picks[key].changed.size + picks[key].removed.size,
        0,
      ),
    [picks, entityKeys],
  )

  const totals = entityKeys.reduce(
    (acc, key) => {
      const g = diff.byEntity[key]
      acc.added += g.added.length
      acc.changed += g.changed.length
      acc.removed += g.removed.length
      acc.same += g.same
      return acc
    },
    { added: 0, changed: 0, removed: 0, same: 0 },
  )

  const nothing = totals.added + totals.changed + totals.removed === 0

  return (
    <div class="modal modal--wide merge" role="dialog" aria-label={tr('merge.title')}>
      <h2>{tr('merge.title')}</h2>
      <p class="note">{tr('merge.summary', fileName, totals.added, totals.changed, totals.removed, totals.same)}</p>

      {diff.notes.length > 0 && (
        <p class="note note--warn">{tr('merge.unknownEntities', diff.notes.join(', '))}</p>
      )}

      {nothing ? (
        <p class="note note--ok">{tr('merge.identical')}</p>
      ) : (
        <div class="merge__body">
          {entityKeys.map((key) => {
            const entity = entities[key]
            const schema = entity.schema
            const group = diff.byEntity[key]
            if (!group.added.length && !group.changed.length && !group.removed.length) return null
            return (
              <section key={key}>
                {entityKeys.length > 1 && <p class="label">{schema.plural}</p>}

                <Group
                  kind="added"
                  items={group.added}
                  entityKey={key}
                  schema={schema}
                  picks={picks}
                  toggle={toggle}
                  toggleAll={toggleAll}
                  tr={tr}
                  render={(item) => <b>{item.record[schema.titleField]}</b>}
                />

                <Group
                  kind="changed"
                  items={group.changed}
                  entityKey={key}
                  schema={schema}
                  picks={picks}
                  toggle={toggle}
                  toggleAll={toggleAll}
                  tr={tr}
                  render={(item) => (
                    <>
                      <b>{item.mine[schema.titleField]}</b>
                      <ul class="merge__diff">
                        {item.diffs.map((d) => (
                          <li key={d.key}>
                            <span class="merge__field">{d.label}</span>
                            <span class="merge__before">{String(d.before ?? '') || '—'}</span>
                            <span class="merge__after">{String(d.after ?? '') || '—'}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                />

                <Group
                  kind="removed"
                  items={group.removed}
                  entityKey={key}
                  schema={schema}
                  picks={picks}
                  toggle={toggle}
                  toggleAll={toggleAll}
                  tr={tr}
                  render={(item) => <b>{item.record[schema.titleField]}</b>}
                />
              </section>
            )
          })}
        </div>
      )}

      <div class="modal__foot">
        <button class="btn btn--quiet" onClick={onCancel}>
          {tr('common.cancel')}
        </button>
        <button class="btn btn--primary" disabled={chosen === 0} onClick={() => onApply(picks)}>
          {tr('merge.apply', chosen)}
        </button>
      </div>
    </div>
  )
}

function Group({ kind, items, entityKey, schema, picks, toggle, toggleAll, tr, render }) {
  if (!items.length) return null
  const set = picks[entityKey][kind]
  const ids = items.map((x) => x.id)
  const all = ids.every((id) => set.has(id))

  return (
    <div class={'merge__group merge__group--' + kind}>
      <div class="merge__head">
        <span>{tr(`merge.group.${kind}`, items.length)}</span>
        <button class="btn btn--quiet" onClick={() => toggleAll(entityKey, kind, ids, !all)}>
          {all ? tr('merge.none') : tr('merge.all')}
        </button>
      </div>
      {kind === 'removed' && <p class="note note--warn">{tr('merge.removedNote')}</p>}
      <ul class="merge__list">
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={set.has(item.id)}
                onChange={() => toggle(entityKey, kind, item.id)}
              />
              <span class="cell-id">{item.id}</span>
              <span class="merge__what">{render(item)}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
