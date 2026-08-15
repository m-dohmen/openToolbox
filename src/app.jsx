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
import { toCsv, fromCsv } from './lib/csv.js'
import * as domainModule from './domain.js'
import {
  normalizeEntities,
  isSingleEntity,
  referenceFields,
  findReferencingRecords,
  resolveReferenceTitle,
  computeCounts,
  coerceField,
} from './lib/entities.js'
import { Wordmark } from './brand.jsx'
import { paletteVariables } from './lib/color.js'
import { IconSave, IconSettings } from './icons.jsx'
import { SettingsPage } from './settings.jsx'
import { ChatDock } from './chat.jsx'
import { AI_DEFAULTS } from './lib/ai.js'
import { countOpen, DEFAULT_COUNT_URL } from './lib/count.js'
import { translator, DEFAULT_LOCALE } from './i18n.js'

/**
 * Ein domain.js mit einem einzelnen SCHEMA-Export (wie src/domain.js selbst)
 * läuft unverändert als Ein-Entity-Anwendung; eines mit ENTITIES-Export
 * beschreibt mehrere Datensatztypen, ggf. mit Reference-Feldern
 * untereinander. Der Rest der Anwendung kennt ab hier nur noch ENTITIES.
 * Siehe src/lib/entities.js und das Wiki, Abschnitt "Building Your Own Tool".
 */
const ENTITIES = normalizeEntities(domainModule)
const ENTITY_KEYS = Object.keys(ENTITIES)
const DEFAULT_ENTITY_KEY = ENTITY_KEYS[0]
const SINGLE = isSingleEntity(ENTITIES)

/** Legt eine geladene/gefehlte Datensatzmenge auf alle Entitäten um. */
function normalizeRecordsByEntity(records) {
  const byEntity = Array.isArray(records) ? { [DEFAULT_ENTITY_KEY]: records } : { ...records }
  for (const key of ENTITY_KEYS) {
    if (!byEntity[key]) byEntity[key] = ENTITIES[key].seed()
  }
  return byEntity
}

const seedAll = () => Object.fromEntries(ENTITY_KEYS.map((key) => [key, ENTITIES[key].seed()]))

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
import { applyActions, describeActions } from './lib/actions.js'
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
  analytics: true,
  analyticsUrl: DEFAULT_COUNT_URL,
  title: 'Action items',
  subtitle: 'Open points from audits and steering meetings',
  fileStem: 'action-items',
  colors: DEFAULT_COLORS,
  brand: DEFAULT_BRAND,
  ai: AI_DEFAULTS,
}

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
  const [recordsByEntity, setRecordsByEntity] = useState(null)
  const [passphrase, setPassphrase] = useState(null)
  const [apiKey, setApiKey] = useState('')

  // Erststart oder unverschlüsselter Datenstand: sofort loslegen.
  useEffect(() => {
    if (!payload) return setRecordsByEntity(seedAll())
    if (payload.enc) return
    setRecordsByEntity(normalizeRecordsByEntity(payload.data.records))
    setApiKey(payload.data.secrets?.apiKey ?? '')
  }, [])

  if (payload?.enc && recordsByEntity === null) {
    return (
      <Gate
        title={storedSettings.title}
        brand={storedSettings.brand}
        locale={storedSettings.locale}
        envelope={payload.envelope}
        onOpen={(data, pass) => {
          setRecordsByEntity(normalizeRecordsByEntity(data.records))
          setPassphrase(pass)
          setApiKey(data.secrets?.apiKey ?? '')
        }}
      />
    )
  }

  if (recordsByEntity === null) return null

  return (
    <Workbench
      initialRecordsByEntity={recordsByEntity}
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
  initialRecordsByEntity,
  initialSettings,
  passphrase,
  setPassphrase,
  apiKey,
  setApiKey,
  savedAt,
  fresh,
}) {
  const [recordsByEntity, setRecordsByEntity] = useState(initialRecordsByEntity)
  const [activeKey, setActiveKey] = useState(DEFAULT_ENTITY_KEY)
  const [settings, setSettings] = useState(initialSettings)
  const [view, setView] = useState('list')
  const [dirty, setDirty] = useState(fresh)
  const [lastSaved, setLastSaved] = useState(savedAt)
  const [query, setQuery] = useState('')
  const [facet, setFacet] = useState({})
  const [sort, setSort] = useState({ key: ENTITIES[DEFAULT_ENTITY_KEY].schema.list[0], dir: 1 })
  const [draft, setDraft] = useState(null)
  const [showKey, setShowKey] = useState(false)
  const [askKey, setAskKey] = useState(initialSettings.ai.enabled && !apiKey)
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)
  const [csvImport, setCsvImport] = useState(null)

  const tr = translator(settings.locale)
  const entity = ENTITIES[activeKey]
  const schema = entity.schema
  const records = recordsByEntity[activeKey]

  const notify = (text, kind) => {
    setToast({ text, kind })
    setTimeout(() => setToast(null), 3600)
  }

  const mutate = (next) => {
    setRecordsByEntity((all) => ({ ...all, [activeKey]: next }))
    setDirty(true)
  }

  /* Tabs zwischen Entitäten wechseln Filter/Sortierung/Entwurf zurück -
     die sind pro Schema, ein Übertrag zwischen unterschiedlichen Feldern
     ergäbe keinen Sinn. */
  const switchEntity = (key) => {
    setActiveKey(key)
    setQuery('')
    setFacet({})
    setSort({ key: ENTITIES[key].schema.list[0], dir: 1 })
    setDraft(null)
  }

  /** Springt zu einem referenzierten Datensatz - Klick auf einen Reference-Chip. */
  const navigateReference = (targetKey, id) => {
    const targetRecords = recordsByEntity[targetKey] ?? []
    const targetSchema = ENTITIES[targetKey].schema
    const found = targetRecords.find((r) => r[targetSchema.idField] === id)
    switchEntity(targetKey)
    if (found) setDraft({ ...found })
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

  /* Einmal je geöffneter Datei, nicht bei jedem Rendern - siehe lib/count.js.
     Leere Abhängigkeitsliste mit Absicht: wer den Zähler in dieser Sitzung
     abschaltet, hat schon gezählt; wer ihn einschaltet, zählt beim nächsten
     Öffnen. Beides ist ehrlicher als nachträglich zu feuern. */
  useEffect(() => {
    if (settings.analytics) {
      countOpen(settings.analyticsUrl, ENTITIES[DEFAULT_ENTITY_KEY].schema.singular)
    }
  }, [])

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
      // Einzelne Entität: Datensätze als flaches Array speichern, exakt wie
      // vor der Mehr-Entitäten-Unterstützung - bestehende Dateien/Tools
      // bleiben davon unberührt. Mehrere Entitäten: als Objekt je Schlüssel.
      const recordsForSave = SINGLE ? recordsByEntity[DEFAULT_ENTITY_KEY] : recordsByEntity
      // Der Schlüssel wandert nur mit, wenn das in den Einstellungen
      // ausdrücklich angehakt ist. Bei verschlüsselter Datei liegt er im
      // Umschlag, sonst - auf ausdrücklichen Wunsch - im Klartext.
      const keepKey = settings.ai.enabled && settings.ai.storeKey && apiKey
      const body = keepKey ? { records: recordsForSave, secrets: { apiKey } } : { records: recordsForSave }
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

  const field = (key) => schema.fields.find((f) => f.key === key)

  const counts = useMemo(() => computeCounts(entity, records), [records, activeKey])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = records.filter(
      (r) =>
        schema.facets.every((key) => !facet[key] || r[key] === facet[key]) &&
        (!q || schema.search.map((k) => r[k]).join(' ').toLowerCase().includes(q)),
    )
    return out.sort((a, b) => {
      const x = a[sort.key] ?? ''
      const y = b[sort.key] ?? ''
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sort.dir
      return String(x).localeCompare(String(y), settings.locale) * sort.dir
    })
  }, [records, query, facet, sort, settings.locale, activeKey])

  const payloadSize = useMemo(() => JSON.stringify(recordsByEntity).length, [recordsByEntity])

  const sortBy = (key) =>
    setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))

  /* Datensätze ------------------------------------------------- */

  const commit = (rec) => {
    const idKey = schema.idField
    mutate(
      records.some((r) => r[idKey] === rec[idKey])
        ? records.map((r) => (r[idKey] === rec[idKey] ? rec : r))
        : [...records, rec],
    )
    setDraft(null)
  }

  /**
   * Einziger Weg, auf dem das Modell den Datenstand anfassen kann.
   * Geprüft wird hier, nicht dort - die Antwort ist ein Vorschlag, kein Befehl.
   * Wirkt über alle Entitäten hinweg, nicht nur die gerade aktive.
   */
  const runActions = (actions) => {
    const outcome = applyActions(recordsByEntity, actions, ENTITIES, tr, activeKey)
    if (outcome.done.length) {
      setRecordsByEntity(outcome.next)
      setDirty(true)
      notify(tr('toast.changesApplied', outcome.done.length))
    } else if (outcome.problems.length) {
      notify(tr('toast.noProposal'), 'error')
    }
    return { done: outcome.done, problems: outcome.problems }
  }

  /** Löscht nur, wenn kein anderer Datensatz per Reference-Feld darauf zeigt. */
  const remove = (id) => {
    const refs = findReferencingRecords(ENTITIES, recordsByEntity, activeKey, id)
    if (refs.length) {
      const names = refs.map((h) => `${h.record[h.entity.schema.titleField]} (${h.entity.schema.singular})`).join(', ')
      notify(tr('drawer.blockedByReferences', names), 'error')
      return
    }
    mutate(records.filter((r) => r[schema.idField] !== id))
    setDraft(null)
  }

  /* Austausch -------------------------------------------------- */

  const exportCsv = () => {
    const columns = [
      { key: schema.idField, label: tr('app.id') },
      ...schema.fields.map((f) => ({ key: f.key, label: f.label })),
    ]
    const rows = visible.map((r) => {
      const row = { ...r }
      for (const f of referenceFields(schema)) {
        row[f.key] = resolveReferenceTitle(ENTITIES, recordsByEntity, f.entity, r[f.key]) ?? r[f.key]
      }
      return row
    })
    const suffix = SINGLE ? '' : `-${activeKey}`
    download(toCsv(rows, columns), `${stem}${suffix}-${today()}.csv`, 'text/csv;charset=utf-8')
  }

  const exportJson = () => {
    const body = SINGLE ? { records: recordsByEntity[activeKey] } : { records: recordsByEntity }
    download(JSON.stringify(body, null, 2), `${stem}-${today()}.json`, 'application/json')
  }

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

  /** Ein flaches Array geht in die aktive Entität, ein Objekt je Entitätsschlüssel ersetzt mehrere auf einmal. */
  async function importJson() {
    const file = await pickFile('.json,application/json')
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const incoming = Array.isArray(parsed) ? parsed : parsed.records
      if (Array.isArray(incoming)) {
        mutate(incoming)
        notify(tr('toast.recordsImported', incoming.length))
      } else if (incoming && typeof incoming === 'object') {
        setRecordsByEntity((all) => ({ ...all, ...incoming }))
        setDirty(true)
        const count = Object.values(incoming).reduce((n, arr) => n + (arr?.length ?? 0), 0)
        notify(tr('toast.recordsImported', count))
      } else {
        throw new Error('No records array or entity map found')
      }
    } catch (err) {
      notify(tr('toast.importCancelled', err.message), 'error')
    }
  }

  /**
   * CSV kommt in zwei Schritten: erst lesen und die Spalten vorschlagsweise
   * zuordnen, dann - nach Bestätigung im Dialog - zeilenweise durch dieselbe
   * Typprüfung schicken, die auch KI-Vorschläge durchlaufen.
   */
  async function importCsv() {
    const file = await pickFile('.csv,text/csv,text/plain')
    if (!file) return
    try {
      const { columns, rows, delimiter } = fromCsv(await file.text())
      if (!rows.length) {
        notify(tr('import.empty'), 'error')
        return
      }
      // Vorbelegung: Spaltenüberschrift gegen Feldbeschriftung und Feldschlüssel
      // vergleichen, ohne Rücksicht auf Groß-/Kleinschreibung und Sonderzeichen.
      const simplify = (s) => String(s).toLowerCase().replace(/[^a-z0-9äöüß]/g, '')
      const mapping = {}
      const taken = new Set()
      columns.forEach((column, index) => {
        const needle = simplify(column)
        const hit = schema.fields.find(
          (f) => !taken.has(f.key) && (simplify(f.label) === needle || simplify(f.key) === needle),
        )
        if (hit) {
          mapping[index] = hit.key
          taken.add(hit.key)
        }
      })
      setCsvImport({ name: file.name, columns, rows, delimiter, mapping, mode: 'append', result: null })
    } catch (err) {
      notify(tr('toast.importCancelled', err.message), 'error')
    }
  }

  function runCsvImport() {
    const { columns, rows, mapping, mode } = csvImport
    const mapped = Object.entries(mapping).filter(([, key]) => key)
    if (!mapped.length) {
      setCsvImport((s) => ({ ...s, result: { built: 0, problems: [tr('import.nothingMapped')] } }))
      return
    }

    const problems = []
    const built = []
    // Zeilennummer aus Sicht des Anwenders: Kopfzeile ist Zeile 1.
    rows.forEach((cells, i) => {
      const where = tr('import.row', i + 2)
      const record = { ...entity.emptyRecord() }
      for (const [index, key] of mapped) {
        const raw = cells[Number(index)]
        if (raw === undefined || String(raw).trim() === '') continue
        const outcome = coerceField(schema, key, raw, {
          entities: ENTITIES,
          recordsByEntity,
        })
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
      record[schema.idField] = entity.uid()
      built.push(record)
    })

    if (built.length) mutate(mode === 'replace' ? built : [...records, ...built])
    setCsvImport((s) => ({ ...s, result: { built: built.length, problems } }))
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
          <button class="btn btn--primary" onClick={() => { setView('list'); setDraft(entity.emptyRecord()) }}>
            {tr('app.new', schema.singular)}
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
          onImportCsv={importCsv}
          onExportConfig={exportConfiguration}
          onImportConfig={importConfiguration}
          onResetColors={() => changeSettings({ colors: DEFAULT_COLORS })}
          recordCount={records.length}
        />
      ) : (
      <>
      {ENTITY_KEYS.length > 1 && (
        <div class="entity-tabs" role="tablist" aria-label={tr('entities.tabsLabel')}>
          {ENTITY_KEYS.map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={String(key === activeKey)}
              onClick={() => switchEntity(key)}
            >
              {ENTITIES[key].schema.plural}
            </button>
          ))}
        </div>
      )}
      <div class="body">
        <aside class="rail">
          <section>
            <p class="label">{tr('sidebar.overview')}</p>
            <dl class="kpi">
              <div>
                <dt>{schema.plural}</dt>
                <dd>{counts.total}</dd>
              </div>
              <div class={counts.overdue ? 'is-flag' : ''}>
                <dt>{tr('sidebar.overdue')}</dt>
                <dd>{counts.overdue}</dd>
              </div>
              {schema.totalField && (
                <div>
                  <dt>{tr('sidebar.openTotal', field(schema.totalField).label)}</dt>
                  <dd>{counts.total_sum}</dd>
                </div>
              )}
            </dl>
          </section>

          {schema.facets.map((key) => (
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
              <button onClick={importCsv}>{tr('sidebar.importCsv')}</button>
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
              <button class="btn btn--primary" onClick={() => setDraft(entity.emptyRecord())}>
                {tr('app.new', schema.singular)}
              </button>
            </div>
          ) : (
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <Th sort={sort} k={schema.idField} onSort={sortBy}>{tr('app.id')}</Th>
                    {schema.list.map((key) => (
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
                      key={r[schema.idField]}
                      data-selected={draft?.[schema.idField] === r[schema.idField]}
                      onClick={() => setDraft({ ...r })}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setDraft({ ...r })}
                    >
                      <td class="cell-id">{r[schema.idField]}</td>
                      {schema.list.map((key) => (
                        <Cell
                          key={key}
                          record={r}
                          field={field(key)}
                          schema={schema}
                          entities={ENTITIES}
                          recordsByEntity={recordsByEntity}
                          entity={entity}
                          onNavigateReference={navigateReference}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
      </>
      )}

      {settings.ai.enabled && (
        <ChatDock
          config={settings.ai}
          apiKey={apiKey}
          onDialect={learnDialect}
          onActions={runActions}
          entities={ENTITIES}
          recordsByEntity={recordsByEntity}
          visible={visible}
          activeKey={activeKey}
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
            key={activeKey + ':' + draft[schema.idField]}
            record={draft}
            schema={schema}
            singular={schema.singular}
            entities={ENTITIES}
            recordsByEntity={recordsByEntity}
            isNew={!records.some((r) => r[schema.idField] === draft[schema.idField])}
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

      {csvImport && (
        <>
          <div class="scrim" onClick={() => setCsvImport(null)} />
          <CsvImportDialog
            state={csvImport}
            schema={schema}
            tr={tr}
            onMap={(index, key) =>
              setCsvImport((s) => ({ ...s, mapping: { ...s.mapping, [index]: key } }))
            }
            onMode={(mode) => setCsvImport((s) => ({ ...s, mode }))}
            onRun={runCsvImport}
            onClose={() => setCsvImport(null)}
          />
        </>
      )}

      {toast && <div class={'toast' + (toast.kind === 'error' ? ' toast--error' : '')}>{toast.text}</div>}
    </div>
  )
}

/* ── Bausteine ────────────────────────────────────────────────── */

/**
 * Zwei Schritte in einem Dialog: erst die Spalten der Datei den Feldern
 * zuordnen, danach das Ergebnis mit allen Beanstandungen. Der zweite Schritt
 * verschweigt nichts - abgelehnte Zeilen werden benannt, nicht stillschweigend
 * übergangen, wie schon bei den KI-Vorschlägen.
 */
function CsvImportDialog({ state, schema, tr, onMap, onMode, onRun, onClose }) {
  const { name, columns, rows, delimiter, mapping, mode, result } = state

  if (result) {
    return (
      <div class="modal modal--wide" role="dialog" aria-label={tr('import.resultTitle')}>
        <h2>{tr('import.resultTitle')}</h2>
        <p class={result.built ? 'note note--ok' : 'note note--warn'}>
          {result.built ? tr('import.done', result.built) : tr('import.noneValid')}
        </p>
        {result.problems.length > 0 && (
          <>
            <p class="note note--warn">{tr('import.problemCount', result.problems.length)}</p>
            <ul class="import__problems">
              {result.problems.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </>
        )}
        <div class="modal__foot">
          <button class="btn btn--primary" onClick={onClose}>
            {tr('common.close')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div class="modal modal--wide" role="dialog" aria-label={tr('import.title')}>
      <h2>{tr('import.title')}</h2>
      <p class="note">{tr('import.summary', name, rows.length, delimiter)}</p>
      <p>{tr('import.lead')}</p>

      <table class="import__map">
        <thead>
          <tr>
            <th>{tr('import.columnHead')}</th>
            <th>{tr('import.fieldHead')}</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column, index) => (
            <tr key={index}>
              <td>
                <code>{column || `#${index + 1}`}</code>
                <small>{rows[0]?.[index]}</small>
              </td>
              <td>
                <select
                  value={mapping[index] ?? ''}
                  onChange={(e) => onMap(index, e.currentTarget.value)}
                >
                  <option value="">{tr('import.ignore')}</option>
                  {schema.fields.map((f) => (
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

      <div class="field">
        <label>{tr('import.mode')}</label>
        <div class="seg" role="group">
          <button type="button" aria-pressed={String(mode === 'append')} onClick={() => onMode('append')}>
            {tr('import.append')}
          </button>
          <button type="button" aria-pressed={String(mode === 'replace')} onClick={() => onMode('replace')}>
            {tr('import.replace')}
          </button>
        </div>
      </div>

      <div class="modal__foot">
        <button class="btn btn--quiet" onClick={onClose}>
          {tr('common.cancel')}
        </button>
        <button class="btn btn--primary" onClick={onRun}>
          {tr('import.run')}
        </button>
      </div>
    </div>
  )
}

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
 * schema.subField, Aufzählungen werden zu Pillen, Datumsangaben rot bei
 * Überfälligkeit, Reference-Felder zu einem klickbaren Chip mit dem Titel
 * des Zieldatensatzes. Damit reicht das Schema aus, um die Liste zu erzeugen.
 */
function Cell({ record, field, schema, entities, recordsByEntity, entity, onNavigateReference }) {
  const value = record[field.key]

  if (field.key === schema.titleField) {
    return (
      <td class="cell-title">
        {value}
        {schema.subField && <small>{record[schema.subField]}</small>}
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

  if (field.type === 'reference') {
    const title = resolveReferenceTitle(entities, recordsByEntity, field.entity, value)
    return (
      <td>
        {title ? (
          <button
            class="ref-chip"
            onClick={(e) => {
              e.stopPropagation()
              onNavigateReference(field.entity, value)
            }}
          >
            {title}
          </button>
        ) : (
          <span class="cell-num">—</span>
        )}
      </td>
    )
  }

  if (field.type === 'date') {
    return (
      <td class={'cell-date' + (entity.isOverdue(record) ? ' is-overdue' : '')}>{entity.formatDate(value)}</td>
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

function RecordDrawer({ record, schema, singular, entities, recordsByEntity, isNew, onCancel, onSave, onDelete, tr }) {
  const [r, setR] = useState(record)
  const [confirm, setConfirm] = useState(false)
  const first = useRef(null)

  // `key` beim Aufrufer (Entität + Id) montiert diese Komponente pro
  // Datensatz neu, `r` braucht daher nur seinen Startwert aus dem useState
  // oben - kein Abgleich bei Id-Wechsel per Effekt. Genau der lief bisher
  // der ersten Eingabe hinterher: er feuerte nach dem Mount und setzte `r`
  // auf den veralteten record-Prop zurück, was schnelle Eingaben verschluckte.
  useEffect(() => first.current?.focus(), [])

  const set = (k) => (e) => setR({ ...r, [k]: e.currentTarget.value })

  return (
    <aside class="drawer" role="dialog" aria-label={tr('drawer.ariaLabel')}>
      <div class="drawer__head">
        <h2>{isNew ? tr('drawer.new', singular) : tr('drawer.edit', singular)}</h2>
        <span class="cell-id">{r[schema.idField]}</span>
      </div>

      <div class="drawer__body">
        {schema.fields.map((f, i) => (
          <div class="field" key={f.key}>
            <label for={'f-' + f.key}>{f.label}</label>

            {f.type === 'enum' ? (
              <select id={'f-' + f.key} value={r[f.key]} onChange={set(f.key)}>
                {f.values.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            ) : f.type === 'reference' ? (
              <select id={'f-' + f.key} value={r[f.key] ?? ''} onChange={set(f.key)}>
                <option value=""></option>
                {(recordsByEntity[f.entity] ?? []).map((opt) => (
                  <option key={opt[entities[f.entity].schema.idField]} value={opt[entities[f.entity].schema.idField]}>
                    {opt[entities[f.entity].schema.titleField]}
                  </option>
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
          disabled={!String(r[schema.titleField] ?? '').trim()}
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
            onClick={() => (confirm ? onDelete(r[schema.idField]) : setConfirm(true))}
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
