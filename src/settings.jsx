// SPDX-License-Identifier: Apache-2.0
import { useRef, useState } from 'preact/hooks'
import { IconBack, IconLock, IconChat } from './icons.jsx'
import { Wordmark } from './brand.jsx'
import { chatCompletion, CONTEXT_MODES, dialectSummary, resolveUrl } from './lib/ai.js'
import { sanitizeSvg } from './lib/svg.js'
import { contrastRatio } from './lib/color.js'

const Row = ({ label, hint, children }) => (
  <div class="setting">
    <div class="setting__text">
      <span class="setting__label">{label}</span>
      {hint && <span class="setting__hint">{hint}</span>}
    </div>
    <div class="setting__control">{children}</div>
  </div>
)

const Segmented = ({ value, options, onChange }) => (
  <div class="seg" role="group">
    {options.map(([val, text]) => (
      <button key={val} type="button" aria-pressed={String(value === val)} onClick={() => onChange(val)}>
        {text}
      </button>
    ))}
  </div>
)

const Toggle = ({ checked, onChange, label }) => (
  <label class="toggle">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
    <span>{label}</span>
  </label>
)

const Swatch = ({ value, onChange, id }) => (
  <label class="swatch">
    <input id={id} type="color" value={value} onInput={(e) => onChange(e.currentTarget.value)} />
    <code>{value}</code>
  </label>
)

export function SettingsPage({
  settings,
  onChange,
  apiKey,
  onApiKey,
  onDialect,
  sealed,
  onEncrypt,
  onRemoveEncryption,
  onBack,
  onExportCsv,
  onExportJson,
  onImportJson,
  onExportConfig,
  onImportConfig,
  onResetColors,
  recordCount,
}) {
  const [probe, setProbe] = useState({ state: 'idle', message: '' })
  const [logoNote, setLogoNote] = useState('')
  const logoPicker = useRef(null)

  async function runProbe() {
    setProbe({ state: 'busy', message: '' })
    try {
      const answer = await chatCompletion({
        config: settings.ai,
        apiKey,
        onDialect,
        messages: [{ role: 'user', content: 'Reply with a single word: ready' }],
      })
      setProbe({ state: 'ok', message: `Endpoint reachable. Reply: ${answer.slice(0, 120)}` })
    } catch (err) {
      setProbe({ state: 'error', message: err.message })
    }
  }

  const set = (key) => (value) => onChange({ [key]: value })
  const setAi = (key) => (value) => onChange({ ai: { ...settings.ai, [key]: value } })
  const setColor = (key) => (value) => onChange({ colors: { ...settings.colors, [key]: value } })
  const setBrand = (key) => (value) => onChange({ brand: { ...settings.brand, [key]: value } })
  const ai = settings.ai
  const colors = settings.colors

  async function loadLogo(file) {
    if (!file) return
    try {
      const { svg, removed } = sanitizeSvg(await file.text())
      setBrand('logo')(svg)
      setLogoNote(
        removed.length
          ? `Logo applied. Removed for safety: ${removed.join(', ')}.`
          : 'Logo applied.',
      )
    } catch (err) {
      setLogoNote(err.message)
    }
  }

  const bandContrast = contrastRatio(colors.band, '#ffffff').toFixed(1)

  return (
    <div class="settings">
      <div class="settings__inner">
        <button class="btn btn--quiet settings__back" onClick={onBack}>
          <IconBack /> Back to the list
        </button>

        <h2 class="settings__title">Settings</h2>
        <p class="settings__lead">
          Everything here is written into the file when you save and travels with it. Whoever
          receives the file receives these settings too.
        </p>

        <section>
          <p class="label">Appearance</p>

          <Row label="Color scheme" hint="Stored with the file and applied the next time it is opened.">
            <Segmented
              value={settings.theme}
              onChange={set('theme')}
              options={[
                ['system', 'System'],
                ['light', 'Light'],
                ['dark', 'Dark'],
              ]}
            />
          </Row>

          <Row label="Row height" hint="Compact fits roughly a third more rows on long lists.">
            <Segmented
              value={settings.density}
              onChange={set('density')}
              options={[
                ['normal', 'Normal'],
                ['kompakt', 'Compact'],
              ]}
            />
          </Row>

          <Row label="Watermark" hint="Semi-transparent mark in the bottom right corner.">
            <Toggle
              checked={settings.watermark}
              onChange={set('watermark')}
              label={settings.watermark ? 'visible' : 'hidden'}
            />
          </Row>
        </section>

        <section>
          <p class="label">Colors</p>

          <Row
            label="Accent"
            hint="Carries everything active: primary buttons, filters, links. The lighter and darker shades are derived from it."
          >
            <Swatch id="c-accent" value={colors.accent} onChange={setColor('accent')} />
          </Row>

          <Row
            label="Header bar"
            hint={`Top bar, table head, side panel. Contrast against white text: ${bandContrast}:1 — below 4.5 it gets hard to read.`}
          >
            <Swatch id="c-band" value={colors.band} onChange={setColor('band')} />
          </Row>

          <Row label="Attention" hint="Overdue items and the waiting state.">
            <Swatch id="c-flag" value={colors.flag} onChange={setColor('flag')} />
          </Row>

          <Row label="Done" hint="Completed items.">
            <Swatch id="c-ok" value={colors.ok} onChange={setColor('ok')} />
          </Row>

          <Row label="Unsaved" hint="The dot in the file bar while changes are pending.">
            <Swatch id="c-pending" value={colors.pending} onChange={setColor('pending')} />
          </Row>

          <Row label="Back to defaults" hint="Restores the shipped palette.">
            <div class="setting__buttons">
              <button class="btn" onClick={onResetColors}>Reset colors</button>
            </div>
          </Row>
        </section>

        <section>
          <p class="label">Branding</p>

          <Row label="Product name" hint="Shown in the header, on the lock screen and as the watermark when no logo is set.">
            <input value={settings.brand.name} onInput={(e) => setBrand('name')(e.currentTarget.value)} />
          </Row>

          <Row
            label="Logo"
            hint="An SVG file. It is embedded into the HTML, so it travels with the file. Scripts, event handlers and external references are stripped before it is used."
          >
            <div class="setting__buttons">
              <input
                ref={logoPicker}
                type="file"
                accept=".svg,image/svg+xml"
                style="display:none"
                onChange={(e) => {
                  loadLogo(e.currentTarget.files?.[0])
                  e.currentTarget.value = ''
                }}
              />
              <button class="btn" onClick={() => logoPicker.current?.click()}>
                {settings.brand.logo ? 'Replace SVG' : 'Upload SVG'}
              </button>
              {settings.brand.logo && (
                <button
                  class="btn btn--danger"
                  onClick={() => {
                    setBrand('logo')('')
                    setLogoNote('')
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </Row>

          {settings.brand.logo && (
            <Row label="Preview" hint="Rendered the way it appears in the header.">
              <div class="logo-preview">
                <Wordmark brand={settings.brand} />
              </div>
            </Row>
          )}

          {logoNote && <p class="note note--ok">{logoNote}</p>}
        </section>

        <section>
          <p class="label">Application</p>

          <Row label="Title" hint="Shown in the header and on the lock screen.">
            <input value={settings.title} onInput={(e) => set('title')(e.currentTarget.value)} />
          </Row>

          <Row label="Subtitle">
            <input value={settings.subtitle} onInput={(e) => set('subtitle')(e.currentTarget.value)} />
          </Row>

          <Row label="File name" hint="Without extension. Drives the save suggestion and the export files.">
            <div class="suffixed">
              <input
                value={settings.fileStem}
                onInput={(e) =>
                  set('fileStem')(e.currentTarget.value.replace(/[^\w.\-]+/g, '-').toLowerCase())
                }
              />
              <span>.html</span>
            </div>
          </Row>
        </section>

        <section>
          <p class="label">Security</p>

          <Row
            label={sealed ? 'This file is encrypted' : 'This file is plain text'}
            hint={
              sealed
                ? 'AES-256-GCM with a key derived from your passphrase through PBKDF2. Without it there is no recovery.'
                : 'Anyone who opens the file sees the full data set.'
            }
          >
            <div class="setting__buttons">
              <button class="btn" onClick={onEncrypt}>
                <IconLock /> {sealed ? 'Change passphrase' : 'Encrypt'}
              </button>
              {sealed && (
                <button class="btn btn--danger" onClick={onRemoveEncryption}>
                  Remove
                </button>
              )}
            </div>
          </Row>

          <p class="note">
            Encryption protects the data, not access to the application. Roles and views in a file
            that runs locally would be surface only — whoever holds the file also holds the code.
          </p>
        </section>

        <section>
          <p class="label">AI integration</p>

          <Row
            label="AI integration active"
            hint="While this is off the application opens no network connection at all. There is no second way out."
          >
            <Toggle
              checked={ai.enabled}
              onChange={setAi('enabled')}
              label={ai.enabled ? 'on' : 'off'}
            />
          </Row>

          {ai.enabled && (
            <>
              <p class="note note--warn">
                From now on every question sends the records in this file to the endpoint configured
                below. In regulated environments that is outsourcing — clear it with the responsible
                function before you use it.
              </p>

              <Row
                label="Endpoint"
                hint={
                  ai.baseUrl
                    ? `Requests go to: ${resolveUrl(ai)}`
                    : 'Base URL, usually up to and including /v1. Append an Azure api-version as a query string.'
                }
              >
                <input
                  placeholder="https://…/openai/v1"
                  value={ai.baseUrl}
                  onInput={(e) => setAi('baseUrl')(e.currentTarget.value.trim())}
                />
              </Row>

              <Row label="Model" hint="Name or deployment, exactly as the endpoint expects it.">
                <input
                  placeholder="gpt-4o-mini"
                  value={ai.model}
                  onInput={(e) => setAi('model')(e.currentTarget.value.trim())}
                />
              </Row>

              <Row
                label="Authentication"
                hint="Bearer for OpenAI, LiteLLM and most proxies. api-key for Azure AI Foundry."
              >
                <Segmented
                  value={ai.auth}
                  onChange={setAi('auth')}
                  options={[
                    ['bearer', 'Bearer'],
                    ['api-key', 'api-key'],
                  ]}
                />
              </Row>

              <Row
                label="Extra headers"
                hint="One per line as Name: Value, for gateways that expect their own headers. An api-version belongs in the URL query."
              >
                <textarea
                  rows="2"
                  placeholder={'x-gateway-id: internal\nx-request-source: opentoolbox'}
                  value={ai.headers}
                  onInput={(e) => setAi('headers')(e.currentTarget.value)}
                />
              </Row>

              <Row label="API key" hint="Takes effect immediately for this session. Whether it also lands in the file is decided below.">
                <input
                  type="password"
                  autocomplete="off"
                  placeholder="sk-…"
                  value={apiKey}
                  onInput={(e) => onApiKey(e.currentTarget.value)}
                />
              </Row>

              <Row
                label="Store the key"
                hint={
                  ai.storeKey && !sealed
                    ? 'The key then sits in plain text inside a file that gets passed around. Only sensible if the file stays on this machine — otherwise encrypt first.'
                    : sealed
                      ? 'The key goes into the encrypted part of the file and is unreadable without the passphrase.'
                      : 'Without this, the file asks for the key once when it is opened. That is the safe default.'
                }
              >
                <Toggle
                  checked={ai.storeKey}
                  onChange={setAi('storeKey')}
                  label={ai.storeKey ? 'stored in file' : 'this session only'}
                />
              </Row>

              {ai.storeKey && !sealed && (
                <p class="note note--warn">
                  This file is not encrypted. Anyone who opens it can read the key in the source.
                  Either set a passphrase above or clear this checkbox.
                </p>
              )}

              <Row
                label="Context sent along"
                hint="What travels with every question: the filtered view, all records, or only the aggregates without individual cases."
              >
                <Segmented value={ai.context} onChange={setAi('context')} options={CONTEXT_MODES} />
              </Row>

              <Row
                label="Changes to the data"
                hint="On an explicit instruction the model may create, update and delete records. Every proposal is validated and shown first."
              >
                <Toggle
                  checked={ai.allowWrite}
                  onChange={setAi('allowWrite')}
                  label={ai.allowWrite ? 'allowed' : 'read only'}
                />
              </Row>

              {ai.allowWrite && (
                <Row
                  label="Apply without asking"
                  hint="Off means you see every proposal as a list and decide. That is the default and the only sensible setting where changes have to be justified."
                >
                  <Toggle
                    checked={ai.autoApply}
                    onChange={setAi('autoApply')}
                    label={ai.autoApply ? 'apply immediately' : 'show first'}
                  />
                </Row>
              )}

              <Row label="Role of the model" hint="System instruction sent before every question.">
                <textarea
                  rows="4"
                  value={ai.systemPrompt}
                  onInput={(e) => setAi('systemPrompt')(e.currentTarget.value)}
                />
              </Row>

              <Row label="Temperature and length" hint="Temperature 0 to 2, answer length in tokens.">
                <div class="pair">
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={ai.temperature}
                    onInput={(e) => setAi('temperature')(Number(e.currentTarget.value))}
                  />
                  <input
                    type="number"
                    min="64"
                    step="64"
                    value={ai.maxTokens}
                    onInput={(e) => setAi('maxTokens')(Number(e.currentTarget.value))}
                  />
                </div>
              </Row>

              <Row label="Test the connection" hint="A minimal call to the endpoint, without any data from the file.">
                <div class="setting__buttons">
                  <button class="btn" disabled={probe.state === 'busy'} onClick={runProbe}>
                    <IconChat /> {probe.state === 'busy' ? 'testing …' : 'Test'}
                  </button>
                </div>
              </Row>

              {probe.message && (
                <p class={probe.state === 'error' ? 'chat__error' : 'note note--ok'}>
                  {probe.message}
                </p>
              )}

              <Row
                label="Negotiated dialect"
                hint="Worked out on the first successful call and stored with the file. Reset it after switching models."
              >
                <div class="setting__buttons">
                  <span class="dialect">{dialectSummary(ai.dialect)}</span>
                  {ai.dialect && (
                    <button class="btn btn--quiet" onClick={() => setAi('dialect')(null)}>
                      Reset
                    </button>
                  )}
                </div>
              </Row>
            </>
          )}
        </section>

        <section>
          <p class="label">Data</p>

          <Row label={`${recordCount} records`} hint="Export writes separate files; the application itself is untouched.">
            <div class="setting__buttons">
              <button class="btn" onClick={onExportCsv}>CSV</button>
              <button class="btn" onClick={onExportJson}>JSON</button>
              <button class="btn" onClick={onImportJson}>Import JSON</button>
            </div>
          </Row>
        </section>

        <section>
          <p class="label">Configuration</p>

          <Row
            label="Save or transfer these settings"
            hint="Everything on this page as JSON — without records and without the API key. Meant for carrying a working setup over to other tools."
          >
            <div class="setting__buttons">
              <button class="btn" onClick={onExportConfig}>Save</button>
              <button class="btn" onClick={onImportConfig}>Load</button>
            </div>
          </Row>

          <p class="note">
            Loading only takes what is defined here; anything else is dropped and named in the
            notice. If the loaded configuration has AI switched on, the application asks for the key
            afterwards.
          </p>
        </section>

        <footer class="settings__foot">
          <Wordmark brand={settings.brand} class="settings__logo" />
          <div>
            <p>
              © {new Date().getFullYear()} M. Dohmen · openToolbox · Apache License 2.0
            </p>
            <p>Single-file application. Runs locally, without a server and without installation.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
