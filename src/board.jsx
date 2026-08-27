// SPDX-License-Identifier: Apache-2.0
/**
 * Kanban-Brett pro Entitaet. Die Aktivierung kommt aus `schema.view.board`,
 * die Spaltenreihenfolge aus dem enum-Feld, die Kartenfelder aus der
 * Konfiguration oder - wenn nicht angegeben - aus den ersten drei lesbaren
 * Schema-Feldern abseits von Titel und Spalte.
 *
 * Drei Pfade, eine Aenderung: ein Drag&Drop, ein Tastatur-Kommando und ein
 * Touch-Drop rufen alle dieselbe Callback-Funktion auf. Die Andockung an
 * Undo/Redo und das Aenderungsprotokoll uebernimmt die App, indem sie die
 * Bewegung durch `mutate` schickt - dasselbe Loch, das auch das Formular
 * benutzt. Eine Bewegung ist damit kein Sonderfall mehr, sondern eine
 * Aenderung wie jede andere.
 *
 * Tastatur: Pfeile verschieben den Fokus und gleichzeitig den Kandidaten
 * einer Bewegung; Enter bestaetigt, Esc verwirft. Der Kandidat lebt nur in
 * der Sitzung - bis Enter gedrueckt wird, hat sich nichts geaendert, ein Esc
 * braucht keinen Undo.
 */
import { useMemo, useState } from 'preact/hooks'
import { fieldValue } from './lib/entities.js'
import { groupByColumn, applyColumnLimit } from './lib/board.js'
import { highlightParts } from './lib/search.js'

/* Eine einzelne Karte: Titel plus die konfigurierten Felder. Drag&Drop laeuft
   ueber das HTML5-API, Pointer Events uebernehmen den Touch-Fall, und die
   Tastatur bekommt eigene Handler auf der Karte selbst. */
function Card({ record, schema, entity, config, q, focused, draggable, onPointerDown, onKeyDown }) {
  const fieldDef = (key) => schema.fields.find((f) => f.key === key)
  /* Berechnete Felder gehen durch fieldValue, alles andere direkt - damit
     verhaelt sich die Karte genauso wie die Tabelle daneben. */
  const cellValue = (key) => {
    const def = fieldDef(key)
    if (!def) return record[key]
    if (def.type === 'computed') return fieldValue(entity, record, key)
    return record[key]
  }
  const Hi = ({ text }) => {
    const parts = highlightParts(text ?? '', q)
    return (
      <>
        {parts.map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : p.text))}
      </>
    )
  }
  const title = cellValue(schema.titleField) ?? ''
  return (
    <article
      class={'board__card' + (focused ? ' is-focused' : '')}
      tabIndex={0}
      draggable={draggable}
      data-id={record[schema.idField]}
      onDragStart={draggable ? (e) => onPointerDown({ id: record[schema.idField], via: 'mouse' }, e) : undefined}
      onDragEnd={onPointerDown ? () => onPointerDown(null) : undefined}
      onKeyDown={onKeyDown}
      aria-grabbed={focused ? 'true' : undefined}
    >
      <h4 class="board__card-title">
        <Hi text={title} />
      </h4>
      {config.cardFields.map((key) => {
        const def = fieldDef(key)
        if (!def) return null
        const value = cellValue(key)
        let display = value
        if (def.type === 'date') display = value ? entity.formatDate(value) : '—'
        else if (def.type === 'enum' && value) display = (
          <span class={'pill pill--' + String(value).replace(/\s/g, '').toLowerCase()}>{value}</span>
        )
        else if (def.type === 'number') display = value == null || value === '' ? '—' : value
        else if (def.type === 'attachment') display = value?.name || '—'
        else display = value ?? '—'
        return (
          <div class="board__field" key={key}>
            <span class="board__field-label">{def.short ?? def.label}</span>
            <span class="board__field-value">{typeof display === 'string' ? <Hi text={display} /> : display}</span>
          </div>
        )
      })}
    </article>
  )
}

/* Eine Spalte: Titel, Karten, Limit-Hinweis, Drop-Zone. Die Spalte selbst
   ist die Drop-Zone, nicht eine Karte - ein Drop zwischen Karten gehoert
   zur Spalte, nicht zu einer Nachbarkarte. */
function Column({ value, records, schema, entity, config, q, focusedCard, dragOver, draggable, onMove, tr }) {
  const { exceeded, shown } = applyColumnLimit(records, config.limit)

  const drop = (e) => {
    e.preventDefault()
    if (!draggable) return
    const id = e.dataTransfer?.getData('text/plain')
    if (id) onMove(id, value)
  }

  return (
    <section
      class={'board__column' + (dragOver === value ? ' is-drop-target' : '')}
      data-column={value}
      onDragOver={draggable ? (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onMove.dragOver?.(value)
      } : undefined}
      onDragLeave={(e) => {
        /* dragLeave feuert auch beim Wechsel zwischen Kindern - nur loeschen,
           wenn die Spalte selbst verlassen wird. */
        if (!e.currentTarget.contains(e.relatedTarget)) onMove.dragLeave?.(value)
      }}
      onDrop={drop}
      aria-label={tr('board.columnLabel', value, records.length)}
    >
      <header class="board__column-head">
        <h3 class="board__column-title">
          <span class="board__column-name">{value}</span>
          <span class="board__column-count">{records.length}</span>
        </h3>
      </header>
      {exceeded && (
        <p class="board__limit" role="status">
          {tr('board.limitHint', config.limit, records.length)}
        </p>
      )}
      <div class="board__cards">
        {shown.map((record) => (
          <Card
            key={record[schema.idField]}
            record={record}
            schema={schema}
            entity={entity}
            config={config}
            q={q}
            focused={focusedCard?.id === record[schema.idField]}
            draggable={draggable}
            onPointerDown={onMove.pointerDown}
            onKeyDown={(e) => onMove.keyDown(record, value, e)}
          />
        ))}
      </div>
    </section>
  )
}

export function BoardView({ schema, entity, records, config, readOnly, q, onMove, tr }) {
  /* Spalten und Reserve kommen aus einer reinen Funktion; ohne useMemo
     wuerde jeder Render die Verteilung neu rechnen, obwohl sie nur von den
     Datensaetzen abhaengt. */
  const { columns, unassigned } = useMemo(
    () => groupByColumn(records, config.columnField, schema),
    [records, config.columnField, schema],
  )
  const columnDef = schema.fields.find((f) => f.key === config.columnField)
  const columnValues = columnDef?.values ?? Object.keys(columns)

  /* DnD-Zustand: welche Karte wird gerade gezogen, ueber welche Spalte der
     Mauszeiger schwebt. Beides lebt nur hier, damit der Aufrufer nicht
     selbst Buch fuehren muss. */
  const [draggingId, setDraggingId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  /* Tastatur-Kandidat: steht eine Bewegung an, die noch nicht bestaetigt ist?
     Bis Enter gedrueckt wird, ist nichts geaendert - ein Esc macht den
     Kandidaten ohne Undo wieder rueckgaengig. */
  const [pending, setPending] = useState(null)

  const draggable = !readOnly

  /* Pointer-Start (HTML5-DnD): Karte merken, Spalten hervorheben. */
  const pointerDown = (info, e) => {
    if (!info) {
      setDraggingId(null)
      return
    }
    setDraggingId(info.id)
    if (e?.dataTransfer) {
      e.dataTransfer.setData('text/plain', info.id)
      e.dataTransfer.effectAllowed = 'move'
    }
  }

  const dragLeave = (value) => {
    if (dragOver === value) setDragOver(null)
  }

  /* Tatsaechliche Bewegung - dieselbe Funktion, die Tastatur und DnD am
     Ende rufen. Geht durch den Callback des Aufrufers, der `mutate` und
     damit den normalen Aenderungspfad nutzt. */
  const commit = (id, target) => {
    setDraggingId(null)
    setDragOver(null)
    if (!id || !target) return
    onMove(id, target)
  }

  const dragOverCol = (value) => setDragOver(value)

  /* Tastatur auf der Karte: Pfeile aendern den Kandidaten, Enter bestaetigt,
     Esc verwirft. Der Kandidat steht in der Sitzung, nicht im Datensatz -
     ein Esc ohne Enter hebt die Bewegung auf, ohne dass etwas zurueck
     muesste. */
  const keyDown = (record, currentColumn, e) => {
    if (readOnly) return
    const key = e.key
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(key)) return
    e.preventDefault()
    const id = record[schema.idField]
    /* Esc: alles rueckgaengig, was die Sitzung gerade vorschlaegt. */
    if (key === 'Escape') {
      setPending(null)
      return
    }
    if (key === 'Enter') {
      if (pending?.id === id) commit(id, pending.target)
      return
    }
    const currentIndex = columnValues.indexOf(currentColumn)
    let nextTarget = currentColumn
    if (key === 'ArrowLeft') nextTarget = columnValues[(currentIndex - 1 + columnValues.length) % columnValues.length]
    else if (key === 'ArrowRight') nextTarget = columnValues[(currentIndex + 1) % columnValues.length]
    /* Up/Down aendert die Spalte nicht - sie sind hier Reserve, weil eine
       Reihenfolge innerhalb der Spalte erst entsteht, wenn jemand Karten
       explizit sortiert. Wer das braucht, nutzt die Tabelle. */
    if (nextTarget === currentColumn && pending?.id !== id) return
    setPending({ id, target: nextTarget })
  }

  const moveHandler = {
    pointerDown,
    dragOver: dragOverCol,
    dragLeave,
    keyDown,
    /* DnD-Drop landet hier: Karte, Zielspalte, fertig. */
    drop: (id, value) => commit(id, value),
  }

  return (
    <div class="board" role="region" aria-label={tr('board.region')}>
      {columnValues.map((value) => (
        <Column
          key={value}
          value={value}
          records={columns[value] ?? []}
          schema={schema}
          entity={entity}
          config={config}
          q={q}
          focusedCard={pending}
          dragOver={dragOver}
          draggable={draggable}
          onMove={moveHandler}
          tr={tr}
        />
      ))}
      {unassigned.length > 0 && (
        <Column
          value={''}
          records={unassigned}
          schema={schema}
          entity={entity}
          config={config}
          q={q}
          focusedCard={pending}
          dragOver={dragOver}
          draggable={false}
          onMove={moveHandler}
          tr={tr}
        />
      )}
    </div>
  )
}