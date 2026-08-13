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
import { translator, DEFAULT_LOCALE } from './i18n.js'

/** Anpassbare Grundfarben. Die Abstufungen werden daraus gerechnet. */
export const DEFAULT_COLORS = {
  accent: '#0e7c86',
  band: '#16202b',
  flag: '#c2521b',
  ok: '#2e7d5b',
  pending: '#d19a0a',
}

/** Wortmarke und optionales Logo. Beides reist mit der Datei. */
export const DEFAULT_BRAND = {
  name: 'openToolbox',
  logo:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="openToolbox logo" preserveAspectRatio="xMinYMid meet">' +
    '<title>openToolbox</title>' +
    '<defs><linearGradient id="otb-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">' +
    '<stop offset="0" stop-color="#2bb3bf"/><stop offset="1" stop-color="#0b5e66"/>' +
    '</linearGradient></defs>' +
    '<rect x="0" y="0" width="100" height="100" rx="22" fill="url(#otb-bg)"/>' +
    '<path d="M35,20 H57 L73,36 V74 A8,8 0 0 1 65,82 H35 A8,8 0 0 1 27,74 V28 A8,8 0 0 1 35,20 Z" fill="#ffffff"/>' +
    '<path d="M57,20 L57,32 A4,4 0 0 0 61,36 L73,36 Z" fill="#bdeef1"/>' +
    '<rect x="57" y="27" width="27" height="23" rx="7" fill="#ffffff"/>' +
    '<path d="M65.5,38.5 v-4.2 a5,5 0 0 1 10,0 v4.2" fill="none" stroke="url(#otb-bg)" stroke-width="3.2" stroke-linecap="round"/>' +
    '<rect x="63.5" y="38.5" width="14" height="10.5" rx="3" fill="url(#otb-bg)"/>' +
    '<circle cx="70.5" cy="43" r="1.7" fill="#ffffff"/>' +
    '<rect x="69.6" y="43" width="1.8" height="3.4" rx="0.9" fill="#ffffff"/>' +
    '</svg>',
}
import { applyActions } from './lib/actions.js'
import { exportConfig, importConfig } from './lib/config.js'

/**
 * Einstellungen reisen im Payload mit, liegen aber bewusst außerhalb des
 * verschlüsselten Umschlags: sonst stünde der Sperrbildschirm im falschen
 * Farbschema und unter falschem Titel da. Geheim ist hier nichts.
 * `locale` steuert nur die Oberflächensprache (src/i18n.js) - Feldnamen und
 * Daten aus src/domain.js bleiben davon unberührt, siehe README.
 */
const DEFAULT_SETTINGS = {
  theme: 'system',
  density: 'normal',
  watermark: true,
  locale: DEFAULT_LOCALE,
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
        locale={storedSettings.locale}
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

function Gate({ envelope, onOpen, title, brand, locale }) {
  const tr = translator(locale)
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
      setError(tr('gate.error'))
      setBusy(false)
    }
  }

  return (
    <div class="gate">
      <div class="gate__box">
        <Wordmark brand={brand} class="gate__logo" />
        <h1>{tr('gate.title', title)}</h1>
        <p>{tr('gate.body')}</p>
        <div class="field">
          <label for="gate-pass">{tr('gate.passphraseLabel')}</label>
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
          {busy ? tr('gate.decrypting') : tr('gate.unlock')}
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

  const tr = translator(settings.locale)

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

  useEffect(() => {
    document.documentElement.lang = settings.locale
  }, [settings.locale])

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
      notify(written === 'handle' ? tr('toast.savedHandle') : tr('toast.savedAs', name))
    } catch (err) {
      if (err?.name !== 'AbortError') notify(tr('toast.saveError', err.message), 'error')
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
      return String(x).localeCompare(String(y), settings.locale) * sort.dir
    })
  }, [records, query, facet, sort, settings.locale])

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
    const outcome = applyActions(records, actions, SCHEMA, uid, emptyRecord, tr)
    if (outcome.done.length) {
      mutate(outcome.next)
      notify(tr('toast.changesApplied', outcome.done.length))
    } else if (outcome.problems.length) {
      notify(tr('toast.noProposal'), 'error')
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
        notes.length ? tr('toast.configApplied', notes[0]) : tr('toast.configAppliedPlain'),
        notes.length ? 'error' : undefined,
      )
    } catch (err) {
      notify(tr('toast.importCancelled', err.message), 'error')
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
      notify(tr('toast.recordsImported', incoming.length))
    } catch (err) {
      notify(tr('toast.importCancelled', err.message), 'error')
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
        locale={settings.locale}
        tr={tr}
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
            title={tr('app.settings')}
            aria-label={tr('app.settings')}
            aria-pressed={String(view === 'settings')}
            onClick={() => setView(view === 'settings' ? 'list' : 'settings')}
          >
            <IconSettings />
          </button>
          <button class="btn btn--primary" onClick={() => { setView('list'); setDraft(emptyRecord()) }}>
            {tr('app.new', SCHEMA.singular)}
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
            notify(tr('toast.encryptionRemoved'))
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
            <p class="label">{tr('sidebar.overview')}</p>
            <dl class="kpi">
              <div>
                <dt>{SCHEMA.plural}</dt>
                <dd>{counts.total}</dd>
              </div>
              <div class={counts.overdue ? 'is-flag' : ''}>
                <dt>{tr('sidebar.overdue')}</dt>
                <dd>{counts.overdue}</dd>
              </div>
              {SCHEMA.totalField && (
                <div>
                  <dt>{tr('sidebar.openTotal', field(SCHEMA.totalField).label)}</dt>
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
                  {tr('sidebar.all')}
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
            <p class="label">{tr('sidebar.exchange')}</p>
            <div class="linklist">
              <button onClick={exportCsv}>{tr('sidebar.csv')}</button>
              <button onClick={exportJson}>{tr('sidebar.exportJson')}</button>
              <button onClick={importJson}>{tr('sidebar.importJson')}</button>
            </div>
          </section>
        </aside>

        <main class="main">
          <div class="toolbar">
            <input
              class="search"
              type="search"
              placeholder={tr('search.placeholder')}
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
            <span class="counter">{tr('search.counter', visible.length, records.length)}</span>
          </div>

          {visible.length === 0 ? (
            <div class="empty">
              <h2>{records.length ? tr('empty.noMatches') : tr('empty.nothingYet')}</h2>
              <p>{records.length ? tr('empty.noMatchesHint') : tr('empty.nothingYetHint')}</p>
              <button class="btn btn--primary" onClick={() => setDraft(emptyRecord())}>
                {tr('app.new', SCHEMA.singular)}
              </button>
            </div>
          ) : (
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <Th sort={sort} k={SCHEMA.idField} onSort={sortBy}>{tr('app.id')}</Th>
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
          locale={settings.locale}
        />
      )}

      {settings.watermark && (
        <div class="watermark">
          <a
            href="https://github.com/m-dohmen/openToolbox"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="openToolbox on GitHub"
            title="openToolbox on GitHub"
          >
            <Wordmark brand={settings.brand} class="wordmark--mark" />
          </a>
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
            tr={tr}
          />
        </>
      )}

      {askKey && (
        <>
          <div class="scrim" />
          <KeyPrompt
            model={settings.ai.model}
            tr={tr}
            onSubmit={(key) => {
              setApiKey(key)
              setAskKey(false)
            }}
            onDisable={() => {
              changeSettings({ ai: { ...settings.ai, enabled: false } })
              setAskKey(false)
              notify(tr('toast.aiDisabled'))
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
            tr={tr}
            onClose={() => setShowKey(false)}
            onApply={(pass) => {
              setPassphrase(pass)
              setDirty(true)
              setShowKey(false)
              notify(pass ? tr('toast.passphraseSet') : tr('toast.encryptionRemovedShort'))
            }}
          />
        </>
      )}

      {toast && <div class={'toast' + (toast.kind === 'error' ? ' toast--error' : '')}>{toast.text}</div>}
    </div>
  )
}

/* ── Bausteine ────────────────────────────────────────────────── */

function FileBar({ name, aiOn, dirty, saving, sealed, count, size, lastSaved, onSave, locale, tr }) {
  const dateLocale = locale === 'de' ? 'de-DE' : 'en-US'
  const stamp = lastSaved
    ? new Date(lastSaved).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })
    : tr('filebar.savedNever')

  return (
    <div class="filebar">
      <span class="filebar__name">
        <b>{name}</b>
        <em> — {tr('filebar.tagline')}</em>
      </span>
      <span class="filebar__meta">
        <span>{tr('filebar.records', count)}</span>
        <span>{tr('filebar.dataBlock', kb(size))}</span>
        <span>{tr('filebar.saved', stamp)}</span>
        {aiOn && <span class="filebar__ai">{tr('filebar.aiActive')}</span>}
      </span>
      <span class="filebar__state">
        <span class={'dot ' + (dirty ? 'dot--dirty' : sealed ? 'dot--sealed' : '')} />
        {dirty ? tr('filebar.unsaved') : sealed ? tr('filebar.encrypted') : tr('filebar.plain')}
        <button class="filebar__save" data-dirty={String(dirty)} disabled={saving} onClick={onSave}>
          <IconSave />
          {saving ? tr('filebar.saving') : tr('common.save')}
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

function RecordDrawer({ record, isNew, onCancel, onSave, onDelete, tr }) {
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
    <aside class="drawer" role="dialog" aria-label={tr('drawer.ariaLabel')}>
      <div class="drawer__head">
        <h2>{isNew ? tr('drawer.new', SCHEMA.singular) : tr('drawer.edit', SCHEMA.singular)}</h2>
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
          {tr('common.apply')}
        </button>
        <button class="btn btn--quiet" onClick={onCancel}>
          {tr('common.cancel')}
        </button>
        {!isNew && (
          <button
            class="btn btn--danger"
            onClick={() => (confirm ? onDelete(r.id) : setConfirm(true))}
          >
            {confirm ? tr('drawer.confirmDelete') : tr('drawer.delete')}
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
function KeyPrompt({ model, onSubmit, onDisable, onLater, tr }) {
  const [value, setValue] = useState('')
  const input = useRef(null)

  useEffect(() => input.current?.focus(), [])

  return (
    <div class="modal" role="dialog" aria-label={tr('keyPrompt.label')}>
      <h2>{tr('keyPrompt.title')}</h2>
      <p>{tr('keyPrompt.body', model)}</p>

      <div class="field">
        <label for="ask-key">{tr('keyPrompt.label')}</label>
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
          {tr('keyPrompt.disable')}
        </button>
        <button class="btn btn--quiet" onClick={onLater}>
          {tr('common.later')}
        </button>
        <button class="btn btn--primary" disabled={!value.trim()} onClick={() => onSubmit(value.trim())}>
          {tr('common.apply')}
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
function ratePassphrase(value, tr) {
  if (!value) return null
  const variety = [/[a-z]/, /[A-ZÄÖÜ]/, /\d/, /[^\wÄÖÜäöüß]/].filter((r) => r.test(value)).length

  if (value.length < 8 || variety < 2) {
    return { level: 'weak', text: tr('strength.weak') }
  }
  if (value.length < 14 || variety < 3) {
    return { level: 'ok', text: tr('strength.ok') }
  }
  return { level: 'good', text: tr('strength.good') }
}

function KeyDialog({ active, onClose, onApply, tr }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [error, setError] = useState('')
  const rating = ratePassphrase(a, tr)

  if (!cryptoAvailable()) {
    return (
      <div class="modal" role="dialog">
        <h2>{tr('keyDialog.unavailableTitle')}</h2>
        <p>{tr('keyDialog.unavailableBody')}</p>
        <div class="modal__foot">
          <button class="btn btn--primary" onClick={onClose}>{tr('common.gotIt')}</button>
        </div>
      </div>
    )
  }

  const apply = () => {
    if (!a) return setError(tr('keyDialog.errorEmpty'))
    if (a !== b) return setError(tr('keyDialog.errorMismatch'))
    onApply(a)
  }

  return (
    <div class="modal" role="dialog" aria-label={tr('keyDialog.ariaLabel')}>
      <h2>{active ? tr('keyDialog.changeTitle') : tr('keyDialog.encryptTitle')}</h2>
      <p>{tr('keyDialog.body')}</p>

      <div class="field">
        <label for="k1">{tr('keyDialog.passphraseLabel')}</label>
        <input id="k1" type="password" value={a} onInput={(e) => setA(e.currentTarget.value)} />
      </div>
      <div class="field">
        <label for="k2">{tr('keyDialog.repeatLabel')}</label>
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
            {tr('keyDialog.remove')}
          </button>
        )}
        <button class="btn btn--quiet" onClick={onClose}>{tr('common.cancel')}</button>
        <button class="btn btn--primary" onClick={apply}>{tr('common.apply')}</button>
      </div>
    </div>
  )
}
