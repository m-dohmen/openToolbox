// SPDX-License-Identifier: Apache-2.0
/**
 * Startseite. Der Blick direkt auf die Daten ist wertvoll - aber wer ein
 * Werkzeug gebaut bekommt, will oft zuerst wissen, worum es geht, wofür es da
 * ist und wer es gemacht hat. Genau das steht hier, und der Berater schreibt
 * es selbst.
 *
 * Der Text wird **nicht als HTML abgelegt**, sondern als kleiner
 * Markdown-Teilsatz (lib/markdown.js) und aus einer Baumstruktur gerendert.
 * Eine Datei, die herumgereicht wird, soll keinen Weg enthalten, auf dem
 * fremdes Markup in den DOM kommt.
 *
 * Bearbeitet wird auf der Seite selbst - aber nur, solange die Einstellungen
 * nicht geschützt sind. Der Schutz gegen versehentliche Änderung deckt damit
 * beides ab: die Einstellungsseite und diesen Text.
 */
import { useState } from 'preact/hooks'
import { parse } from './lib/markdown.js'
import { IconLock } from './icons.jsx'

/** Ausgezeichnete Textstücke. Alles Unbekannte bleibt Text. */
function Parts({ parts }) {
  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === 'string') return part
        if (part.type === 'strong') return <strong key={i}>{part.text}</strong>
        if (part.type === 'em') return <em key={i}>{part.text}</em>
        if (part.type === 'code') return <code key={i}>{part.text}</code>
        if (part.type === 'link') {
          return (
            <a key={i} href={part.url} target="_blank" rel="noopener noreferrer">
              {part.text}
            </a>
          )
        }
        return part.text
      })}
    </>
  )
}

export function Prose({ source }) {
  const blocks = parse(source)
  return (
    <div class="prose">
      {blocks.map((block, i) => {
        if (block.type === 'rule') return <hr key={i} />
        if (block.type === 'quote') {
          return (
            <blockquote key={i}>
              <Parts parts={block.parts} />
            </blockquote>
          )
        }
        if (block.type === 'heading') {
          const Tag = `h${Math.min(4, block.level + 1)}`
          return (
            <Tag key={i}>
              <Parts parts={block.parts} />
            </Tag>
          )
        }
        if (block.type === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul'
          return (
            <Tag key={i}>
              {block.items.map((item, k) => (
                <li key={k}>
                  <Parts parts={item} />
                </li>
              ))}
            </Tag>
          )
        }
        return (
          <p key={i}>
            <Parts parts={block.parts} />
          </p>
        )
      })}
    </div>
  )
}

export function HomeView({ text, locked, onChange, onStart, startLabel, tr }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)

  if (editing) {
    return (
      <div class="home">
        <div class="home__inner">
          <p class="home__badge">{tr('home.editing')}</p>
          <textarea
            class="home__editor"
            aria-label={tr('home.editorLabel')}
            value={draft}
            onInput={(e) => setDraft(e.currentTarget.value)}
          />
          <p class="note">{tr('home.syntax')}</p>

          <p class="label">{tr('home.preview')}</p>
          <div class="home__preview">
            <Prose source={draft} />
          </div>

          <div class="home__foot">
            <button
              class="btn btn--primary"
              onClick={() => {
                onChange(draft)
                setEditing(false)
              }}
            >
              {tr('common.apply')}
            </button>
            <button
              class="btn btn--quiet"
              onClick={() => {
                setDraft(text)
                setEditing(false)
              }}
            >
              {tr('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div class="home">
      <div class="home__inner">
        {text.trim() ? <Prose source={text} /> : <p class="note">{tr('home.empty')}</p>}

        <div class="home__foot">
          <button class="btn btn--primary" onClick={onStart}>
            {startLabel}
          </button>
          {/* Geschützte Einstellungen sperren auch diesen Text - sonst wäre der
              Schutz eine halbe Sache, denn hier steht, was das Werkzeug ist. */}
          {locked ? (
            <span class="home__locked">
              <IconLock /> {tr('home.locked')}
            </span>
          ) : (
            <button
              class="btn btn--quiet"
              onClick={() => {
                setDraft(text)
                setEditing(true)
              }}
            >
              {tr('home.edit')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
