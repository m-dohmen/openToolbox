// SPDX-License-Identifier: Apache-2.0
import { useEffect, useRef, useState } from 'preact/hooks'
import {
  chatCompletion,
  buildContext,
  buildInstructions,
  extractActions,
  isTextFile,
  ATTACHMENT_ACCEPT,
  CONTEXT_MODES,
} from './lib/ai.js'
import { describeActions } from './lib/actions.js'
import { SCHEMA } from './domain.js'
import { IconChat, IconSend, IconChevron, IconPaperclip } from './icons.jsx'

const modeLabel = (mode) => CONTEXT_MODES.find(([v]) => v === mode)?.[1] ?? mode
const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`)

/**
 * Angedockter Dialog am unteren Rand. Der Datenteil wird vor jedem Aufruf neu
 * gebaut, damit das Modell nie auf einem veralteten Stand argumentiert.
 * Verlauf und Anhänge leben nur in dieser Sitzung und werden nicht in die
 * Datei geschrieben.
 */
export function ChatDock({ config, apiKey, records, visible, counts, onDialect, onActions }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [attachments, setAttachments] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dropping, setDropping] = useState(false)
  const log = useRef(null)
  const field = useRef(null)
  const picker = useRef(null)

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [messages, busy, error])

  useEffect(() => {
    if (open) field.current?.focus()
  }, [open])

  /* Anhänge ---------------------------------------------------- */

  async function addFiles(list) {
    const files = Array.from(list ?? [])
    if (!files.length) return
    const accepted = []
    const rejected = []

    for (const file of files) {
      if (!isTextFile(file)) {
        rejected.push(file.name)
        continue
      }
      const text = await file.text()
      // Nullbytes deuten auf eine Binärdatei mit harmloser Endung hin.
      if (text.includes('\u0000')) {
        rejected.push(file.name)
        continue
      }
      accepted.push({ name: file.name, size: file.size, text })
    }

    if (accepted.length) {
      setAttachments((current) => [
        ...current.filter((a) => !accepted.some((n) => n.name === a.name)),
        ...accepted,
      ])
    }
    setError(
      rejected.length
        ? `Skipped, no readable text: ${rejected.join(', ')}.`
        : '',
    )
  }

  const removeAttachment = (name) =>
    setAttachments((current) => current.filter((a) => a.name !== name))

  /* Senden ----------------------------------------------------- */

  async function send() {
    const text = input.trim()
    if (!text || busy) return

    const history = [...messages, { role: 'user', content: text }]
    setMessages(history)
    setInput('')
    setError('')
    setBusy(true)

    try {
      const context = buildContext({
        mode: config.context,
        records,
        visible,
        counts,
        attachments,
      })
      const instructions = buildInstructions(SCHEMA, config.allowWrite)

      const answer = await chatCompletion({
        config,
        apiKey,
        onDialect,
        messages: [
          { role: 'system', content: `${config.systemPrompt}\n\n${instructions}\n\n---\n${context}` },
          ...history.map(({ role, content }) => ({ role, content })),
        ],
      })

      const { text: prose, actions } = config.allowWrite
        ? extractActions(answer)
        : { text: answer, actions: [] }

      const entry = { role: 'assistant', content: prose }

      if (actions.length) {
        if (config.autoApply) {
          const outcome = onActions(actions)
          entry.outcome = outcome
        } else {
          entry.pending = actions
        }
      }

      setMessages([...history, entry])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function confirmActions(index) {
    setMessages((current) =>
      current.map((m, i) => {
        if (i !== index || !m.pending) return m
        const outcome = onActions(m.pending)
        return { ...m, pending: null, outcome }
      }),
    )
  }

  const discardActions = (index) =>
    setMessages((current) =>
      current.map((m, i) => (i === index ? { ...m, pending: null, discarded: true } : m)),
    )

  const rowCount =
    config.context === 'alle' ? records.length : config.context === 'sichtbar' ? visible.length : 0

  return (
    <div class="chat" data-open={String(open)}>
      <button class="chat__bar" onClick={() => setOpen(!open)} aria-expanded={String(open)}>
        <IconChat />
        <span class="chat__bar-title">AI assistant</span>
        <span class="chat__bar-meta">
          {config.model || 'no model'} · Context: {modeLabel(config.context)}
          {config.context !== 'kennzahlen' && ` (${rowCount})`}
          {attachments.length > 0 && ` · ${attachments.length} attachment(s)`}
          {config.allowWrite ? ' · changes allowed' : ' · read only'}
        </span>
        <IconChevron class="chat__caret" />
      </button>

      {open && (
        <div
          class="chat__body"
          data-dropping={String(dropping)}
          onDragOver={(e) => {
            e.preventDefault()
            setDropping(true)
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDropping(false)
            addFiles(e.dataTransfer?.files)
          }}
        >
          <div class="chat__log" ref={log}>
            {messages.length === 0 && !error && (
              <p class="chat__hint">
                The records in this file go to the configured endpoint with every question. Text
                files can be attached and are added as extra context.
                {config.allowWrite
                  ? ' On an explicit instruction the model proposes changes, which you see before they are applied.'
                  : ' Write access is switched off in the settings.'}
              </p>
            )}

            {messages.map((m, i) => (
              <div key={i} class={'chat__msg chat__msg--' + m.role}>
                <span class="chat__who">{m.role === 'user' ? 'You' : 'Model'}</span>
                {m.content && <div class="chat__text">{m.content}</div>}

                {m.pending && (
                  <div class="proposal">
                    <p class="proposal__head">
                      Proposed change{m.pending.length > 1 ? 's' : ''} to the data
                    </p>
                    <ul>
                      {describeActions(records, m.pending, SCHEMA).map((line, k) => (
                        <li key={k}>{line}</li>
                      ))}
                    </ul>
                    <div class="proposal__foot">
                      <button class="btn btn--primary" onClick={() => confirmActions(i)}>
                        Apply
                      </button>
                      <button class="btn btn--quiet" onClick={() => discardActions(i)}>
                        Discard
                      </button>
                    </div>
                  </div>
                )}

                {m.discarded && <p class="proposal__note">Proposal discarded.</p>}

                {m.outcome && (
                  <div class="proposal proposal--done">
                    {m.outcome.done.map((line, k) => (
                      <p key={k} class="proposal__note">{line}</p>
                    ))}
                    {m.outcome.problems.map((line, k) => (
                      <p key={'p' + k} class="proposal__note proposal__note--warn">{line}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div class="chat__msg chat__msg--assistant">
                <span class="chat__who">Model</span>
                <div class="chat__text chat__text--wait">thinking …</div>
              </div>
            )}
            {error && <p class="chat__error">{error}</p>}
          </div>

          {attachments.length > 0 && (
            <div class="chips">
              {attachments.map((a) => (
                <span class="chip" key={a.name}>
                  {a.name} <em>{kb(a.size)}</em>
                  <button aria-label={`Remove ${a.name}`} onClick={() => removeAttachment(a.name)}>
                    ×
                  </button>
                </span>
              ))}
              <button class="btn btn--quiet" onClick={() => setAttachments([])}>
                remove all
              </button>
            </div>
          )}

          <div class="chat__input">
            <textarea
              ref={field}
              rows="2"
              placeholder="Ask about or instruct changes to the data in this file …"
              value={input}
              onInput={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <div class="chat__actions">
              <input
                ref={picker}
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                style="display:none"
                onChange={(e) => {
                  addFiles(e.currentTarget.files)
                  e.currentTarget.value = ''
                }}
              />
              <button class="btn" onClick={() => picker.current?.click()}>
                <IconPaperclip /> Files
              </button>
              <button class="btn btn--primary" disabled={busy || !input.trim()} onClick={send}>
                <IconSend /> Send
              </button>
              {messages.length > 0 && (
                <button
                  class="btn btn--quiet"
                  onClick={() => {
                    setMessages([])
                    setError('')
                  }}
                >
                  Clear history
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
