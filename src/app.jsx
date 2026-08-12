// SPDX-License-Identifier: Apache-2.0
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import {
  readPayload,
  buildDocument,
  supportsFileSystemAccess,
  hasFileHandle,
  writeToHandle,
  saveAs,
  download,
  pickFile,
} from './lib/payload.js'
import { seal, open as unseal, cryptoAvailable } from './lib/crypto.js'
import { toCsv } from './lib/csv.js'
import { SCHEMA, seed, emptyRecord, uid, isOverdue, isDone, formatDate } from './domain.js'
import { Wordmark } from './brand.jsx'
import { paletteVariables } from './lib/color.js'
import { IconSave, IconSettings } from './icons.jsx'
import { SettingsPage } from './settings.jsx'
import { ChatDock } from './chat.jsx'
import { AI_DEFAULTS } from './lib/ai.js'

/** Anpassbare Grundfarben. Die Abstufungen werden daraus gerechnet. */
export const DEFAULT_COLORS = {
  accent: '#0e7c86',
  band: '#16202b',
  flag: '#c2521b',
  ok: '#2e7d5b',
  pending: '#d19a0a',
}

/** Wortmarke und optionales Logo. Beides reist mit der Datei. */
export const DEFAULT_BRAND = { name: 'openToolbox', logo: '' }
import { applyActions } from './lib/actions.js'
import { exportConfig, importConfig } from './lib/config.js'

/**
 * Einstellungen reisen im Payload mit, liegen aber bewusst außerhalb des
 * verschlüsselten Umschlags: sonst stünde der Sperrbildschirm im falschen
 * Farbschema und unter falschem Titel da. Geheim ist hier nichts.
 */
const DEFAULT_SETTINGS = {
  theme: 'system',
  density: 'normal',
  watermark: true,
  title: 'Action items',
  subtitle: 'Open points from audits and steering meetings',
  fileStem: 'action-items',
  colors: DEFAULT_COLORS,
  brand: DEFAULT_BRAND,
  ai: AI_DEFAULTS,
}

const CSV_COLUMNS = [
  { key: 'id', label: 'ID' },
  ...SCHEMA.fields.map((f) => ({ key: f.key, label: f.label })),
]

const today = () => new Date().toISOString().slice(0, 10)
const kb = (n) => (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB'

/**
 * Schreibpfad in absteigender Bequemlichkeit:
 * bekannte Zieldatei → Systemdialog → Download-Ordner.
 */
async function persist(html, name) {
  if (hasFileHandle()) {
    await writeToHandle(html)
    return 'handle'
  }
  if (supportsFileSystemAccess()) {
    try {
      await saveAs(html, name)
      return 'picker'
    } catch (err) {
      if (err?.name === 'AbortError') throw err // user cancelled
      console.warn('File dialog unavailable, falling back to download.', err)
    }
  }
  download(html, name)
  return 'download'
}

/* ══════════════════════════════════════════════════════════════ */

export function App() {
  const payload = useMemo(readPayload, [])
  const stored = payload?.settings ?? {}
  const storedSettings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    ai: { ...AI_DEFAULTS, ...(stored.ai ?? {}) },
    colors: { ...DEFAULT_COLORS, ...(stored.colors ?? {}) },
    brand: { ...DEFAULT_BRAND, ...(stored.brand ?? {}) },
  }
  const [records, setRecords] = useState(null)
  const [passphrase, setPassphrase] = useState(null)
  const [apiKey, setApiKey] = useState('')

  // Erststart oder unverschlüsselter Datenstand: sofort loslegen.
  useEffect(() => {
    if (!payload) return setRecords(seed())
    if (payload.enc) return
    setRecords(payload.data.records)
    setApiKey(payload.data.secrets?.apiKey ?? '')
  }, [])

  if (payload?.enc && records === null) {
    return (
      <Gate
        title={storedSettings.title}
        brand={storedSettings.brand}
        envelope={payload.envelope}
        onOpen={(data, pass) => {
          setRecords(data.records)
          setPassphrase(pass)
          setApiKey(data.secrets?.apiKey ?? '')
        }}
      />
    )
  }

  if (records === null) return null

  return (
    <Workbench
      initial={records}
      initialSettings={storedSettings}
      passphrase={passphrase}
      setPassphrase={setPassphrase}
      apiKey={apiKey}
      setApiKey={setApiKey}
      savedAt={payload?.savedAt ?? null}
      fresh={!payload}
    />
  )
}

/* ── Passphrasen-Abfrage beim Öffnen ──────────────────────────── */

function Gate({ envelope, onOpen, title, brand }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef(null)

  useEffect(() => input.current?.focus(), [])

  async function submit() {
    if (!value) return
    setBusy(true)
    setError('')
    try {
      onOpen(await unseal(envelope, value), value)
    } catch {
      setError('That passphrase does not match. The data stays encrypted.')
      setBusy(false)
    }
  }

  return (
    <div class="gate">
      <div class="gate__box">
        <Wordmark brand={brand} class="gate__logo" />
        <h1>{title} is encrypted</h1>
        <p>
          The data in this file is protected with AES-256-GCM. Without the passphrase there is no
          way in — not for anyone.
        </p>
        <div class="field">
          <label for="gate-pass">Passphrase</label>
          <input
            id="gate-pass"
            ref={input}
            type="password"
            value={value}
            onInput={(e) => setValue(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        {error && <p class="error">{error}</p>}
        <button class="btn btn--primary" disabled={busy || !value} onClick={submit}>
          {busy ? 'Decrypting…' : 'Unlock'}
        </button>
      </div>
    </div>
  )
}

/* ── Arbeitsfläche ────────────────────────────────────────────── */

function Workbench({
  initial,
  initialSettings,
  passphrase,
  setPassphrase,
  apiKey,
  setApiKey,
  savedAt,
  fresh,
}) {
  const [records, setRecords] = useState(initial)
  const [settings, setSettings] = useState(initialSettings)
  const [view, setView] = useState('list')
  const [dirty, setDirty] = useState(fresh)
  const [lastSaved, setLastSaved] = useState(savedAt)
  const [query, setQuery] = useState('')
  const [facet, setFacet] = useState({})
  const [sort, setSort] = useState({ key: SCHEMA.list[0], dir: 1 })
  const [draft, setDraft] = useState(null)
  const [showKey, setShowKey] = useState(false)
  const [askKey, setAskKey] = useState(initialSettings.ai.enabled && !apiKey)
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)

  const notify = (text, kind) => {
    setToast({ text, kind })
    setTimeout(() => setToast(null), 3600)
  }

  const mutate = (next) => {
    setRecords(next)
    setDirty(true)
  }

  const learnDialect = (dialect) => {
    setSettings((s) => ({ ...s, ai: { ...s.ai, dialect } }))
    setDirty(true)
  }

  const changeSettings = (partial) => {
    setSettings((s) => ({ ...s, ...partial }))
    setDirty(true)
  }

  /* Farbschema und Zeilenhöhe hängen am Wurzelelement, damit auch die
     festpositionierten Ebenen (Panel, Dialog, Wasserzeichen) sie erben. */
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings.theme])

  useEffect(() => {
    document.documentElement.dataset.density = settings.density
  }, [settings.density])

  useEffect(() => {
    document.documentElement.dataset.chat = settings.ai.enabled ? 'on' : 'off'
  }, [settings.ai.enabled])

  /* Gewählte Farben als Variablen am Wurzelelement — von dort erbt alles,
     auch der Dunkelmodus, weil der nur die Rollen neu zuordnet. */
  useEffect(() => {
    const root = document.documentElement
    const vars = paletteVariables(settings.colors)
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
    return () => {
      for (const name of Object.keys(vars)) root.style.removeProperty(name)
    }
  }, [settings.colors])

  const stem = settings.fileStem || 'app'

  /* Speichern ------------------------------------------------- */

  async function save() {
    setSaving(true)
    try {
      const stamp = new Date().toISOString()
      // Der Schlüssel wandert nur mit, wenn das in den Einstellungen
      // ausdrücklich angehakt ist. Bei verschlüsselter Datei liegt er im
      // Umschlag, sonst - auf ausdrücklichen Wunsch - im Klartext.
      const keepKey = settings.ai.enabled && settings.ai.storeKey && apiKey
      const body = keepKey ? { records, secrets: { apiKey } } : { records }
      const payload = passphrase
        ? { v: 1, savedAt: stamp, settings, enc: true, envelope: await seal(body, passphrase) }
        : { v: 1, savedAt: stamp, settings, enc: false, data: body }

      const html = buildDocument(payload)
      const name = `${stem}-${today()}.html`
      const written = await persist(html, name)

      setDirty(false)
      setLastSaved(payload.savedAt)
      notify(
        written === 'handle'
          ? 'Written back to the selected file.'
          : `Saved as ${name}.`,
      )
    } catch (err) {
      if (err?.name !== 'AbortError') notify('Could not save: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty) save()
      }
      if (e.key === 'Escape') {
        setDraft(null)
        setShowKey(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    const warn = (e) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  /* Ableitungen ------------------------------------------------ */

  const field = (key) => SCHEMA.fields.find((f) => f.key === key)

  const counts = useMemo(() => {
    const c = { total: records.length, overdue: 0, total_sum: 0, facets: {} }
    for (const key of SCHEMA.facets) c.facets[key] = {}
    for (const r of records) {
      if (isOverdue(r)) c.overdue++
      if (SCHEMA.totalField && !isDone(r)) c.total_sum += Number(r[SCHEMA.totalField]) || 0
      for (const key of SCHEMA.facets) {
        c.facets[key][r[key]] = (c.facets[key][r[key]] || 0) + 1
      }
    }
    return c
  }, [records])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = records.filter(
      (r) =>
        SCHEMA.facets.every((key) => !facet[key] || r[key] === facet[key]) &&
        (!q || SCHEMA.search.map((k) => r[k]).join(' ').toLowerCase().includes(q)),
    )
    return out.sort((a, b) => {
      const x = a[sort.key] ?? ''
      const y = b[sort.key] ?? ''
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sort.dir
      return String(x).localeCompare(String(y), 'en') * sort.dir
    })
  }, [records, query, facet, sort])

  const payloadSize = useMemo(() => JSON.stringify(records).length, [records])

  const sortBy = (key) =>
    setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))

  /* Datensätze ------------------------------------------------- */

  const commit = (rec) => {
    mutate(
      records.some((r) => r.id === rec.id)
        ? records.map((r) => (r.id === rec.id ? rec : r))
        : [...records, rec],
    )
    setDraft(null)
  }

  /**
   * Einziger Weg, auf dem das Modell den Datenstand anfassen kann.
   * Geprüft wird hier, nicht dort - die Antwort ist ein Vorschlag, kein Befehl.
   */
  const runActions = (actions) => {
    const outcome = applyActions(records, actions, SCHEMA, uid, emptyRecord)
    if (outcome.done.length) {
      mutate(outcome.next)
      notify(
        outcome.done.length === 1
          ? '1 change applied — not saved yet.'
          : `${outcome.done.length} changes applied — not saved yet.`,
      )
    } else if (outcome.problems.length) {
      notify('No proposal could be applied.', 'error')
    }
    return { done: outcome.done, problems: outcome.problems }
  }

  const remove = (id) => {
    mutate(records.filter((r) => r.id !== id))
    setDraft(null)
  }

  /* Austausch -------------------------------------------------- */

  const exportCsv = () =>
    download(toCsv(visible, CSV_COLUMNS), `${stem}-${today()}.csv`, 'text/csv;charset=utf-8')

  const exportJson = () =>
    download(JSON.stringify({ records }, null, 2), `${stem}-${today()}.json`, 'application/json')

  const exportConfiguration = () =>
    download(
      JSON.stringify(exportConfig(settings), null, 2),
      `${stem}-configuration.json`,
      'application/json',
    )

  async function importConfiguration() {
    const file = await pickFile('.json,application/json')
    if (!file) return
    try {
      const { settings: next, notes } = importConfig(await file.text(), DEFAULT_SETTINGS)
      setSettings(next)
      setDirty(true)
      if (next.ai.enabled && !apiKey) setAskKey(true)
      notify(
        notes.length
          ? `Configuration applied with limitations: ${notes[0]}`
          : 'Configuration applied — not saved yet.',
        notes.length ? 'error' : undefined,
      )
    } catch (err) {
      notify('Import cancelled: ' + err.message, 'error')
    }
  }

  async function importJson() {
    const file = await pickFile('.json,application/json')
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const incoming = Array.isArray(parsed) ? parsed : parsed.records
      if (!Array.isArray(incoming)) throw new Error('No records array found')
      mutate(incoming)
      notify(`${incoming.length} records imported.`)
    } catch (err) {
      notify('Import cancelled: ' + err.message, 'error')
    }
  }

  /* ---------------------------------------------------------- */

  return (
    <div class="shell">
      <FileBar
        name={stem}
        aiOn={settings.ai.enabled}
        dirty={dirty}
        saving={saving}
        sealed={Boolean(passphrase)}
        count={records.length}
        size={payloadSize}
        lastSaved={lastSaved}
        onSave={save}
      />

      <header class="head">
        <div class="brand">
          <Wordmark brand={settings.brand} />
          <span class="brand__rule" />
        </div>
        <div>
          <h1>{settings.title}</h1>
          {settings.subtitle && <p>{settings.subtitle}</p>}
        </div>
        <div class="head__actions">
          <button
            class="iconbtn"
            title="Settings"
            aria-label="Settings"
            aria-pressed={String(view === 'settings')}
            onClick={() => setView(view === 'settings' ? 'list' : 'settings')}
          >
            <IconSettings />
          </button>
          <button class="btn btn--primary" onClick={() => { setView('list'); setDraft(emptyRecord()) }}>
            New {SCHEMA.singular}
          </button>
        </div>
      </header>

      {view === 'settings' ? (
        <SettingsPage
          settings={settings}
          onChange={changeSettings}
          apiKey={apiKey}
          onDialect={learnDialect}
          onApiKey={(v) => {
            setApiKey(v)
            if (settings.ai.storeKey) setDirty(true)
          }}
          sealed={Boolean(passphrase)}
          onEncrypt={() => setShowKey(true)}
          onRemoveEncryption={() => {
            setPassphrase(null)
            setDirty(true)
            notify('Encryption removed — the next save writes plain text.')
          }}
          onBack={() => setView('list')}
          onExportCsv={exportCsv}
          onExportJson={exportJson}
          onImportJson={importJson}
          onExportConfig={exportConfiguration}
          onImportConfig={importConfiguration}
          onResetColors={() => changeSettings({ colors: DEFAULT_COLORS })}
          recordCount={records.length}
        />
      ) : (
      <div class="body">
        <aside class="rail">
          <section>
            <p class="label">Overview</p>
            <dl class="kpi">
              <div>
                <dt>{SCHEMA.plural}</dt>
                <dd>{counts.total}</dd>
              </div>
              <div class={counts.overdue ? 'is-flag' : ''}>
                <dt>Overdue</dt>
                <dd>{counts.overdue}</dd>
              </div>
              {SCHEMA.totalField && (
                <div>
                  <dt>Open {field(SCHEMA.totalField).label.toLowerCase()}</dt>
                  <dd>{counts.total_sum}</dd>
                </div>
              )}
            </dl>
          </section>

          {SCHEMA.facets.map((key) => (
            <section key={key}>
              <p class="label">{field(key).label}</p>
              <div class="filter">
                <FilterButton
                  active={!facet[key]}
                  onClick={() => setFacet({ ...facet, [key]: null })}
                  count={counts.total}
                >
                  All
                </FilterButton>
                {field(key).values.map((value) => (
                  <FilterButton
                    key={value}
                    active={facet[key] === value}
                    onClick={() =>
                      setFacet({ ...facet, [key]: facet[key] === value ? null : value })
                    }
                    count={counts.facets[key][value] || 0}
                  >
                    {value}
                  </FilterButton>
                ))}
              </div>
            </section>
          ))}

          <section>
            <p class="label">Exchange</p>
            <div class="linklist">
              <button onClick={exportCsv}>CSV for Excel</button>
              <button onClick={exportJson}>Export JSON</button>
              <button onClick={importJson}>Import JSON</button>
            </div>
          </section>
        </aside>

        <main class="main">
          <div class="toolbar">
            <input
              class="search"
              type="search"
              placeholder="Search titles, owners, notes…"
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
            <span class="counter">
              {visible.length} of {records.length}
            </span>
          </div>

          {visible.length === 0 ? (
            <div class="empty">
              <h2>{records.length ? 'No matches' : 'Nothing here yet'}</h2>
              <p>
                {records.length
                  ? 'Clear the filters or change the search term.'
                  : 'Create the first item or import a JSON file.'}
              </p>
              <button class="btn btn--primary" onClick={() => setDraft(emptyRecord())}>
                New {SCHEMA.singular}
              </button>
            </div>
          ) : (
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <Th sort={sort} k={SCHEMA.idField} onSort={sortBy}>ID</Th>
                    {SCHEMA.list.map((key) => (
                      <Th
                        key={key}
                        sort={sort}
                        k={key}
                        onSort={sortBy}
                        align={field(key).type === 'number' ? 'right' : undefined}
                      >
                        {field(key).short ?? field(key).label}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr
                      key={r[SCHEMA.idField]}
                      data-selected={draft?.[SCHEMA.idField] === r[SCHEMA.idField]}
                      onClick={() => setDraft({ ...r })}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setDraft({ ...r })}
                    >
                      <td class="cell-id">{r[SCHEMA.idField]}</td>
                      {SCHEMA.list.map((key) => (
                        <Cell key={key} record={r} field={field(key)} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
      )}

      {settings.ai.enabled && (
        <ChatDock
          config={settings.ai}
          apiKey={apiKey}
          onDialect={learnDialect}
          onActions={runActions}
          records={records}
          visible={visible}
          counts={counts}
        />
      )}

      {settings.watermark && (
        <div class="watermark" aria-hidden="true">
          <Wordmark brand={settings.brand} class="wordmark--mark" />
        </div>
      )}

      {draft && (
        <>
          <div class="scrim" onClick={() => setDraft(null)} />
          <RecordDrawer
            key={draft[SCHEMA.idField]}
            record={draft}
            isNew={!records.some((r) => r.id === draft.id)}
            onCancel={() => setDraft(null)}
            onSave={commit}
            onDelete={remove}
          />
        </>
      )}

      {askKey && (
        <>
          <div class="scrim" />
          <KeyPrompt
            model={settings.ai.model}
            onSubmit={(key) => {
              setApiKey(key)
              setAskKey(false)
            }}
            onDisable={() => {
              changeSettings({ ai: { ...settings.ai, enabled: false } })
              setAskKey(false)
              notify('AI integration switched off. The app is fully local again.')
            }}
            onLater={() => setAskKey(false)}
          />
        </>
      )}

      {showKey && (
        <>
          <div class="scrim" onClick={() => setShowKey(false)} />
          <KeyDialog
            active={Boolean(passphrase)}
            onClose={() => setShowKey(false)}
            onApply={(pass) => {
              setPassphrase(pass)
              setDirty(true)
              setShowKey(false)
              notify(pass ? 'Passphrase set — save now.' : 'Encryption removed.')
            }}
          />
        </>
      )}

      {toast && <div class={'toast' + (toast.kind === 'error' ? ' toast--error' : '')}>{toast.text}</div>}
    </div>
  )
}

/* ── Bausteine ────────────────────────────────────────────────── */

function FileBar({ name, aiOn, dirty, saving, sealed, count, size, lastSaved, onSave }) {
  const stamp = lastSaved
    ? new Date(lastSaved).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
    : 'never'

  return (
    <div class="filebar">
      <span class="filebar__name">
        <b>{name}</b>
        <em> — application and data in a single file</em>
      </span>
      <span class="filebar__meta">
        <span>{count} records</span>
        <span>Data block {kb(size)}</span>
        <span>saved: {stamp}</span>
        {aiOn && <span class="filebar__ai">AI integration active</span>}
      </span>
      <span class="filebar__state">
        <span class={'dot ' + (dirty ? 'dot--dirty' : sealed ? 'dot--sealed' : '')} />
        {dirty ? 'unsaved' : sealed ? 'encrypted' : 'plain text'}
        <button class="filebar__save" data-dirty={String(dirty)} disabled={saving} onClick={onSave}>
          <IconSave />
          {saving ? 'writing…' : 'Save'}
        </button>
      </span>
    </div>
  )
}

const FilterButton = ({ active, onClick, count, children }) => (
  <button aria-pressed={String(active)} onClick={onClick}>
    <span>{children}</span>
    <span>{count}</span>
  </button>
)

/**
 * Eine Tabellenzelle nach Feldtyp. Der Titel bekommt die Zweitzeile aus
 * SCHEMA.subField, Aufzählungen werden zu Pillen, Datumsangaben rot bei
 * Überfälligkeit. Damit reicht das Schema aus, um die Liste zu erzeugen.
 */
function Cell({ record, field }) {
  const value = record[field.key]

  if (field.key === SCHEMA.titleField) {
    return (
      <td class="cell-title">
        {value}
        {SCHEMA.subField && <small>{record[SCHEMA.subField]}</small>}
      </td>
    )
  }

  if (field.type === 'enum') {
    return (
      <td>
        <span class={'pill pill--' + String(value).replace(/\s/g, '').toLowerCase()}>{value}</span>
      </td>
    )
  }

  if (field.type === 'date') {
    return (
      <td class={'cell-date' + (isOverdue(record) ? ' is-overdue' : '')}>{formatDate(value)}</td>
    )
  }

  if (field.type === 'number') return <td class="cell-num">{value || '—'}</td>

  return <td>{value || '—'}</td>
}

const Th = ({ sort, k, onSort, align, children }) => (
  <th
    aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
    style={align === 'right' ? 'text-align:right' : undefined}
    onClick={() => onSort(k)}
  >
    {children}
    {sort.key === k && <span class="caret">{sort.dir === 1 ? '▲' : '▼'}</span>}
  </th>
)

function RecordDrawer({ record, isNew, onCancel, onSave, onDelete }) {
  const [r, setR] = useState(record)
  const [confirm, setConfirm] = useState(false)
  const first = useRef(null)

  // `key={id}` beim Aufrufer montiert diese Komponente pro Datensatz neu, `r`
  // braucht daher nur seinen Startwert aus dem useState oben - kein Abgleich
  // bei Id-Wechsel per Effekt. Genau der lief bisher der ersten Eingabe hinterher:
  // er feuerte nach dem Mount und setzte `r` auf den veralteten record-Prop zurück,
  // was schnelle Eingaben verschluckte.
  useEffect(() => first.current?.focus(), [])

  const set = (k) => (e) => setR({ ...r, [k]: e.currentTarget.value })

  return (
    <aside class="drawer" role="dialog" aria-label="Edit record">
      <div class="drawer__head">
        <h2>{isNew ? `New ${SCHEMA.singular}` : `Edit ${SCHEMA.singular}`}</h2>
        <span class="cell-id">{r[SCHEMA.idField]}</span>
      </div>

      <div class="drawer__body">
        {SCHEMA.fields.map((f, i) => (
          <div class="field" key={f.key}>
            <label for={'f-' + f.key}>{f.label}</label>

            {f.type === 'enum' ? (
              <select id={'f-' + f.key} value={r[f.key]} onChange={set(f.key)}>
                {f.values.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            ) : f.type === 'number' ? (
              <input
                id={'f-' + f.key}
                type="number"
                step="0.5"
                value={r[f.key]}
                onInput={(e) => setR({ ...r, [f.key]: Number(e.currentTarget.value) })}
              />
            ) : f.type === 'date' ? (
              <input id={'f-' + f.key} type="date" value={r[f.key]} onInput={set(f.key)} />
            ) : f.long ? (
              <textarea id={'f-' + f.key} value={r[f.key]} onInput={set(f.key)} />
            ) : (
              <input
                id={'f-' + f.key}
                ref={i === 0 ? first : undefined}
                value={r[f.key]}
                onInput={set(f.key)}
              />
            )}
          </div>
        ))}
      </div>

      <div class="drawer__foot">
        <button
          class="btn btn--primary"
          disabled={!String(r[SCHEMA.titleField] ?? '').trim()}
          onClick={() => onSave(r)}
        >
          Apply
        </button>
        <button class="btn btn--quiet" onClick={onCancel}>
          Cancel
        </button>
        {!isNew && (
          <button
            class="btn btn--danger"
            onClick={() => (confirm ? onDelete(r.id) : setConfirm(true))}
          >
            {confirm ? 'Confirm delete' : 'Delete'}
          </button>
        )}
      </div>
    </aside>
  )
}

/**
 * Wird beim Öffnen gezeigt, wenn die KI-Integration an ist, der Schlüssel aber
 * bewusst nicht in der Datei liegt. Ohne Antwort geht es hier nicht weiter -
 * entweder Schlüssel oder Integration aus.
 */
function KeyPrompt({ model, onSubmit, onDisable, onLater }) {
  const [value, setValue] = useState('')
  const input = useRef(null)

  useEffect(() => input.current?.focus(), [])

  return (
    <div class="modal" role="dialog" aria-label="API key">
      <h2>An API key is needed</h2>
      <p>
        AI integration is switched on in this file{model ? ` (${model})` : ''}, but the key was
        deliberately not stored. Enter it for this session, or switch the integration off — then
        the app runs without any network connection again.
      </p>

      <div class="field">
        <label for="ask-key">API key</label>
        <input
          id="ask-key"
          ref={input}
          type="password"
          autocomplete="off"
          value={value}
          onInput={(e) => setValue(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && onSubmit(value.trim())}
        />
      </div>

      <div class="modal__foot">
        <button class="btn" onClick={onDisable}>
          Switch AI integration off
        </button>
        <button class="btn btn--quiet" onClick={onLater}>
          Later
        </button>
        <button class="btn btn--primary" disabled={!value.trim()} onClick={() => onSubmit(value.trim())}>
          Apply
        </button>
      </div>
    </div>
  )
}

/**
 * Grobe Einschätzung, bewusst ohne Zwang. Es gibt genug Fälle, in denen eine
 * Datei nur gegen zufälliges Mitlesen geschützt werden soll und rundherum
 * ohnehin eine abgesicherte Umgebung steht.
 */
function ratePassphrase(value) {
  if (!value) return null
  const variety = [/[a-z]/, /[A-ZÄÖÜ]/, /\d/, /[^\wÄÖÜäöüß]/].filter((r) => r.test(value)).length

  if (value.length < 8 || variety < 2) {
    return {
      level: 'weak',
      text:
        'Short or simple passphrase. It protects against casual reading, not against systematic ' +
        'guessing. In an already secured environment that can be a fair trade.',
    }
  }
  if (value.length < 14 || variety < 3) {
    return { level: 'ok', text: 'Usable. Length helps more than special characters.' }
  }
  return { level: 'good', text: 'Solid passphrase.' }
}

function KeyDialog({ active, onClose, onApply }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [error, setError] = useState('')
  const rating = ratePassphrase(a)

  if (!cryptoAvailable()) {
    return (
      <div class="modal" role="dialog">
        <h2>Encryption unavailable</h2>
        <p>
          This browser does not expose the Web Crypto API in this context. Open the file in a
          current Chrome or Edge.
        </p>
        <div class="modal__foot">
          <button class="btn btn--primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    )
  }

  const apply = () => {
    if (!a) return setError('Please enter a passphrase.')
    if (a !== b) return setError('The two entries do not match.')
    onApply(a)
  }

  return (
    <div class="modal" role="dialog" aria-label="Encryption">
      <h2>{active ? 'Change passphrase' : 'Encrypt this file'}</h2>
      <p>
        AES-256-GCM with a key derived through PBKDF2 (310,000 rounds). Without the passphrase the
        data cannot be recovered — there is no back door.
      </p>

      <div class="field">
        <label for="k1">Passphrase</label>
        <input id="k1" type="password" value={a} onInput={(e) => setA(e.currentTarget.value)} />
      </div>
      <div class="field">
        <label for="k2">Repeat</label>
        <input
          id="k2"
          type="password"
          value={b}
          onInput={(e) => setB(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
        />
      </div>
      {rating && <p class={'strength strength--' + rating.level}>{rating.text}</p>}
      {error && <p class="error">{error}</p>}

      <div class="modal__foot">
        {active && (
          <button class="btn btn--danger" onClick={() => onApply(null)}>
            Remove encryption
          </button>
        )}
        <button class="btn btn--quiet" onClick={onClose}>Cancel</button>
        <button class="btn btn--primary" onClick={apply}>Apply</button>
      </div>
    </div>
  )
}
