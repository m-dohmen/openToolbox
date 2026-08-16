// SPDX-License-Identifier: Apache-2.0
import { useRef, useState } from 'preact/hooks'
import { IconBack, IconLock, IconChat, IconLink } from './icons.jsx'
import { Wordmark } from './brand.jsx'
import { chatCompletion, contextModeOptions, dialectSummary, resolveUrl } from './lib/ai.js'
import { sanitizeSvg } from './lib/svg.js'
import { contrastRatio } from './lib/color.js'
import { MAX_LINKS } from './lib/links.js'
import { translator, LOCALES, LOCALE_LABELS } from './i18n.js'
import { Hint } from './hint.jsx'

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

/**
 * Verweise für die Dateizeile: Symbol, Ziel, Beschriftung.
 *
 * Das Symbol läuft durch denselben Reiniger wie das Logo — es wird eingebettet
 * und wandert mit der Datei weiter. Die Adresse wird erst beim Anzeigen geprüft
 * (`usableLinks`), nicht schon beim Tippen: sonst verschwände der halb
 * eingegebene Verweis nach jedem Zeichen aus der Kopfzeile.
 */
function LinkEditor({ links, tr, onChange, onNote }) {
  const pickers = useRef({})

  const patch = (index, change) =>
    onChange(links.map((link, i) => (i === index ? { ...link, ...change } : link)))

  async function loadIcon(index, file) {
    if (!file) return
    try {
      const { svg, removed } = sanitizeSvg(await file.text())
      patch(index, { icon: svg })
      onNote(removed.length ? tr('settings.logoAppliedRemoved', removed.join(', ')) : tr('settings.iconApplied'))
    } catch (err) {
      onNote(err.message)
    }
  }

  return (
    <div class="links">
      {links.map((link, i) => (
        <div class="links__row" key={i}>
          <span class="links__icon" aria-hidden="true">
            {link.icon ? <span dangerouslySetInnerHTML={{ __html: link.icon }} /> : <IconLink />}
          </span>
          <input
            class="links__url"
            placeholder="https://…"
            value={link.url ?? ''}
            onInput={(e) => patch(i, { url: e.currentTarget.value.trim() })}
          />
          <input
            class="links__label"
            placeholder={tr('settings.linkLabelPlaceholder')}
            value={link.label ?? ''}
            onInput={(e) => patch(i, { label: e.currentTarget.value })}
          />
          <div class="links__buttons">
            <input
              ref={(el) => (pickers.current[i] = el)}
              type="file"
              accept=".svg,image/svg+xml"
              style="display:none"
              onChange={(e) => {
                loadIcon(i, e.currentTarget.files?.[0])
                e.currentTarget.value = ''
              }}
            />
            <button class="btn" onClick={() => pickers.current[i]?.click()}>
              {link.icon ? tr('settings.linkIconReplace') : tr('settings.linkIcon')}
            </button>
            <button
              class="btn btn--danger"
              aria-label={tr('settings.linkRemove')}
              onClick={() => onChange(links.filter((_, k) => k !== i))}
            >
              {tr('common.remove')}
            </button>
          </div>
        </div>
      ))}
      {links.length < MAX_LINKS && (
        <button class="btn" onClick={() => onChange([...links, { icon: '', url: '', label: '' }])}>
          {tr('settings.linkAdd')}
        </button>
      )}
    </div>
  )
}

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
  onImportCsv,
  onMerge,
  onExportConfig,
  onImportConfig,
  onResetColors,
  recordCount,
  showHints,
  locked,
  lockActive,
  onProtect,
  onUnlock,
  onRemoveProtection,
}) {
  const tr = translator(settings.locale)
  const [probe, setProbe] = useState({ state: 'idle', message: '' })
  const [logoNote, setLogoNote] = useState('')
  const [linkNote, setLinkNote] = useState('')
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
      setProbe({ state: 'ok', message: tr('settings.probeReachable', answer.slice(0, 120)) })
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
      setLogoNote(removed.length ? tr('settings.logoAppliedRemoved', removed.join(', ')) : tr('settings.logoApplied'))
    } catch (err) {
      setLogoNote(err.message)
    }
  }

  const bandContrast = contrastRatio(colors.band, '#ffffff').toFixed(1)
  const localeOptions = LOCALES.map((code) => [code, LOCALE_LABELS[code]])

  return (
    <div class="settings">
      <div class="settings__inner">
        <button class="btn btn--quiet settings__back" onClick={onBack}>
          <IconBack /> {tr('settings.back')}
        </button>

        <h2 class="settings__title">{tr('settings.title')}</h2>
        <p class="settings__lead">{tr('settings.lead')}</p>
        <Hint show={showHints} id="settings" tr={tr} />

        {locked && (
          <div class="settings__locked" role="status">
            <p>{tr('settings.lockedBanner')}</p>
            <button class="btn" onClick={onUnlock}>
              <IconLock /> {tr('settings.unlock')}
            </button>
          </div>
        )}

        {/* Ein <fieldset disabled> sperrt jedes Bedienelement darin, ohne dass
            jede einzelne Zeile davon wissen muss - und lässt sie sichtbar. */}
        <fieldset class="settings__fields" disabled={locked}>

        <section>
          <p class="label">{tr('settings.appearance')}</p>

          <Row label={tr('settings.colorScheme')} hint={tr('settings.colorSchemeHint')}>
            <Segmented
              value={settings.theme}
              onChange={set('theme')}
              options={[
                ['system', tr('settings.system')],
                ['light', tr('settings.light')],
                ['dark', tr('settings.dark')],
              ]}
            />
          </Row>

          <Row label={tr('settings.rowHeight')} hint={tr('settings.rowHeightHint')}>
            <Segmented
              value={settings.density}
              onChange={set('density')}
              options={[
                ['normal', tr('settings.normal')],
                ['kompakt', tr('settings.compact')],
              ]}
            />
          </Row>

          <Row label={tr('settings.watermark')} hint={tr('settings.watermarkHint')}>
            <Toggle
              checked={settings.watermark}
              onChange={set('watermark')}
              label={settings.watermark ? tr('settings.visible') : tr('settings.hidden')}
            />
          </Row>

          <Row label={tr('settings.language')} hint={tr('settings.languageHint')}>
            <Segmented value={settings.locale} onChange={set('locale')} options={localeOptions} />
          </Row>

          <Row label={tr('settings.examplePrompts')} hint={tr('settings.examplePromptsHint')}>
            <Toggle
              checked={settings.examplePrompts}
              onChange={set('examplePrompts')}
              label={settings.examplePrompts ? tr('settings.promptsShown') : tr('settings.promptsHidden')}
            />
          </Row>
        </section>

        <section>
          <p class="label">{tr('settings.colors')}</p>

          <Row label={tr('settings.accent')} hint={tr('settings.accentHint')}>
            <Swatch id="c-accent" value={colors.accent} onChange={setColor('accent')} />
          </Row>

          <Row label={tr('settings.headerBar')} hint={tr('settings.headerBarHint', bandContrast)}>
            <Swatch id="c-band" value={colors.band} onChange={setColor('band')} />
          </Row>

          <Row label={tr('settings.attention')} hint={tr('settings.attentionHint')}>
            <Swatch id="c-flag" value={colors.flag} onChange={setColor('flag')} />
          </Row>

          <Row label={tr('settings.done')} hint={tr('settings.doneHint')}>
            <Swatch id="c-ok" value={colors.ok} onChange={setColor('ok')} />
          </Row>

          <Row label={tr('settings.unsavedLabel')} hint={tr('settings.unsavedHint')}>
            <Swatch id="c-pending" value={colors.pending} onChange={setColor('pending')} />
          </Row>

          <Row label={tr('settings.backToDefaults')} hint={tr('settings.backToDefaultsHint')}>
            <div class="setting__buttons">
              <button class="btn" onClick={onResetColors}>{tr('settings.resetColors')}</button>
            </div>
          </Row>
        </section>

        <section>
          <p class="label">{tr('settings.branding')}</p>

          <Row label={tr('settings.productName')} hint={tr('settings.productNameHint')}>
            <input value={settings.brand.name} onInput={(e) => setBrand('name')(e.currentTarget.value)} />
          </Row>

          <Row label={tr('settings.logo')} hint={tr('settings.logoHint')}>
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
                {settings.brand.logo ? tr('settings.replaceSvg') : tr('settings.uploadSvg')}
              </button>
              {settings.brand.logo && (
                <button
                  class="btn btn--danger"
                  onClick={() => {
                    setBrand('logo')('')
                    setLogoNote('')
                  }}
                >
                  {tr('common.remove')}
                </button>
              )}
            </div>
          </Row>

          {settings.brand.logo && (
            <Row label={tr('settings.preview')} hint={tr('settings.previewHint')}>
              <div class="logo-preview">
                <Wordmark brand={settings.brand} />
              </div>
            </Row>
          )}

          {logoNote && <p class="note note--ok">{logoNote}</p>}
        </section>

        <section>
          <p class="label">{tr('settings.application')}</p>

          <Row label={tr('settings.appTitle')} hint={tr('settings.appTitleHint')}>
            <input value={settings.title} onInput={(e) => set('title')(e.currentTarget.value)} />
          </Row>

          <Row label={tr('settings.subtitle')}>
            <input value={settings.subtitle} onInput={(e) => set('subtitle')(e.currentTarget.value)} />
          </Row>

          <Row label={tr('settings.home')} hint={tr('settings.homeHint')}>
            <div class="setting__buttons">
              <button class="btn btn--danger" disabled={!settings.home?.trim()} onClick={() => set('home')('')}>
                {tr('settings.homeClear')}
              </button>
            </div>
          </Row>

          <Row label={tr('settings.tagline')} hint={tr('settings.taglineHint')}>
            <input
              placeholder={tr('filebar.tagline')}
              value={settings.tagline}
              onInput={(e) => set('tagline')(e.currentTarget.value)}
            />
          </Row>

          <Row label={tr('settings.mode')} hint={tr('settings.modeHint')}>
            <Segmented
              value={settings.mode}
              onChange={set('mode')}
              options={[
                ['workbench', tr('settings.modeWorkbench')],
                ['intake', tr('settings.modeIntake')],
              ]}
            />
          </Row>

          <Row label={tr('settings.links')} hint={tr('settings.linksHint', MAX_LINKS)}>
            <LinkEditor
              links={settings.links ?? []}
              tr={tr}
              onChange={set('links')}
              onNote={setLinkNote}
            />
          </Row>

          {linkNote && <p class="note note--ok">{linkNote}</p>}

          <Row label={tr('settings.version')} hint={tr('settings.versionHint')}>
            <input
              placeholder={tr('settings.versionEmpty')}
              value={settings.version}
              onInput={(e) => set('version')(e.currentTarget.value)}
            />
          </Row>

          <Row label={tr('settings.auditLog')} hint={tr('settings.auditLogHint')}>
            <Toggle
              checked={settings.auditLog}
              onChange={set('auditLog')}
              label={settings.auditLog ? tr('settings.logging') : tr('settings.notLogging')}
            />
          </Row>

          <Row label={tr('settings.fileName')} hint={tr('settings.fileNameHint')}>
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

          <Row label={tr('settings.copyrightField')} hint={tr('settings.copyrightFieldHint')}>
            <input
              value={settings.copyright}
              onInput={(e) => set('copyright')(e.currentTarget.value)}
            />
          </Row>

          <Row label={tr('settings.copyrightUrl')} hint={tr('settings.copyrightUrlHint')}>
            <input
              placeholder={tr('settings.copyrightUrlEmpty')}
              value={settings.copyrightUrl}
              onInput={(e) => set('copyrightUrl')(e.currentTarget.value.trim())}
            />
          </Row>
        </section>

        <section>
          <p class="label">{tr('settings.security')}</p>

          <Row
            label={sealed ? tr('settings.encryptedLabel') : tr('settings.plainLabel')}
            hint={sealed ? tr('settings.encryptedHint') : tr('settings.plainHint')}
          >
            <div class="setting__buttons">
              <button class="btn" onClick={onEncrypt}>
                <IconLock /> {sealed ? tr('settings.changePassphrase') : tr('settings.encrypt')}
              </button>
              {sealed && (
                <button class="btn btn--danger" onClick={onRemoveEncryption}>
                  {tr('common.remove')}
                </button>
              )}
            </div>
          </Row>

          <p class="note">{tr('settings.securityNote')}</p>

          <Row label={tr('settings.lock')} hint={tr('settings.lockHint')}>
            <div class="setting__buttons">
              <span class="lock-state">
                {lockActive ? tr('settings.lockActive') : tr('settings.lockInactive')}
              </span>
              <button class="btn" onClick={onProtect}>
                {lockActive ? tr('settings.lockChange') : tr('settings.lockProtect')}
              </button>
              {lockActive && (
                <button class="btn btn--danger" onClick={onRemoveProtection}>
                  {tr('settings.lockRemove')}
                </button>
              )}
            </div>
          </Row>

          <Row label={tr('settings.analytics')} hint={tr('settings.analyticsHint')}>
            <Toggle
              checked={settings.analytics}
              onChange={set('analytics')}
              label={settings.analytics ? tr('settings.counting') : tr('settings.notCounting')}
            />
          </Row>

          {settings.analytics && (
            <Row label={tr('settings.analyticsUrl')} hint={tr('settings.analyticsUrlHint')}>
              <input
                placeholder={tr('settings.analyticsUrlEmpty')}
                value={settings.analyticsUrl}
                onInput={(e) => set('analyticsUrl')(e.currentTarget.value.trim())}
              />
            </Row>
          )}
        </section>

        <section>
          <p class="label">{tr('settings.aiIntegration')}</p>

          <Row label={tr('settings.aiActiveLabel')} hint={tr('settings.aiActiveHint')}>
            <Toggle
              checked={ai.enabled}
              onChange={setAi('enabled')}
              label={ai.enabled ? tr('settings.on') : tr('settings.off')}
            />
          </Row>

          {ai.enabled && (
            <>
              <p class="note note--warn">{tr('settings.aiWarnNote')}</p>
              <Hint show={showHints} id="ai" tr={tr} />

              <Row
                label={tr('settings.endpoint')}
                hint={ai.baseUrl ? tr('settings.endpointHintSet', resolveUrl(ai)) : tr('settings.endpointHintUnset')}
              >
                <input
                  placeholder="https://…/openai/v1"
                  value={ai.baseUrl}
                  onInput={(e) => setAi('baseUrl')(e.currentTarget.value.trim())}
                />
              </Row>

              <Row label={tr('settings.model')} hint={tr('settings.modelHint')}>
                <input
                  placeholder="gpt-4o-mini"
                  value={ai.model}
                  onInput={(e) => setAi('model')(e.currentTarget.value.trim())}
                />
              </Row>

              <Row label={tr('settings.authentication')} hint={tr('settings.authenticationHint')}>
                <Segmented
                  value={ai.auth}
                  onChange={setAi('auth')}
                  options={[
                    ['bearer', 'Bearer'],
                    ['api-key', 'api-key'],
                  ]}
                />
              </Row>

              <Row label={tr('settings.extraHeaders')} hint={tr('settings.extraHeadersHint')}>
                <textarea
                  rows="2"
                  placeholder={'x-gateway-id: internal\nx-request-source: opentoolbox'}
                  value={ai.headers}
                  onInput={(e) => setAi('headers')(e.currentTarget.value)}
                />
              </Row>

              <Row label={tr('settings.apiKey')} hint={tr('settings.apiKeyHint')}>
                <input
                  type="password"
                  autocomplete="off"
                  placeholder="sk-…"
                  value={apiKey}
                  onInput={(e) => onApiKey(e.currentTarget.value)}
                />
              </Row>

              <Row
                label={tr('settings.storeKey')}
                hint={
                  ai.storeKey && !sealed
                    ? tr('settings.storeKeyHintStorePlain')
                    : sealed
                      ? tr('settings.storeKeyHintSealed')
                      : tr('settings.storeKeyHintDefault')
                }
              >
                <Toggle
                  checked={ai.storeKey}
                  onChange={setAi('storeKey')}
                  label={ai.storeKey ? tr('settings.storedInFile') : tr('settings.sessionOnly')}
                />
              </Row>

              {ai.storeKey && !sealed && <p class="note note--warn">{tr('settings.storeKeyWarn')}</p>}

              <Row label={tr('settings.contextSent')} hint={tr('settings.contextSentHint')}>
                <Segmented value={ai.context} onChange={setAi('context')} options={contextModeOptions(tr)} />
              </Row>

              <Row label={tr('settings.changesToData')} hint={tr('settings.changesToDataHint')}>
                <Toggle
                  checked={ai.allowWrite}
                  onChange={setAi('allowWrite')}
                  label={ai.allowWrite ? tr('settings.allowed') : tr('settings.readOnly')}
                />
              </Row>

              {ai.allowWrite && (
                <Row label={tr('settings.applyWithoutAsking')} hint={tr('settings.applyWithoutAskingHint')}>
                  <Toggle
                    checked={ai.autoApply}
                    onChange={setAi('autoApply')}
                    label={ai.autoApply ? tr('settings.applyImmediately') : tr('settings.showFirst')}
                  />
                </Row>
              )}

              <Row label={tr('settings.roleOfModel')} hint={tr('settings.roleOfModelHint')}>
                <textarea
                  rows="4"
                  value={ai.systemPrompt}
                  onInput={(e) => setAi('systemPrompt')(e.currentTarget.value)}
                />
              </Row>

              <Row label={tr('settings.temperatureLength')} hint={tr('settings.temperatureLengthHint')}>
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

              <Row label={tr('settings.testConnection')} hint={tr('settings.testConnectionHint')}>
                <div class="setting__buttons">
                  <button class="btn" disabled={probe.state === 'busy'} onClick={runProbe}>
                    <IconChat /> {probe.state === 'busy' ? tr('settings.testing') : tr('common.test')}
                  </button>
                </div>
              </Row>

              {probe.message && (
                <p class={probe.state === 'error' ? 'chat__error' : 'note note--ok'}>
                  {probe.message}
                </p>
              )}

              <Row label={tr('settings.negotiatedDialect')} hint={tr('settings.negotiatedDialectHint')}>
                <div class="setting__buttons">
                  <span class="dialect">{dialectSummary(ai.dialect, tr)}</span>
                  {ai.dialect && (
                    <button class="btn btn--quiet" onClick={() => setAi('dialect')(null)}>
                      {tr('common.reset')}
                    </button>
                  )}
                </div>
              </Row>
            </>
          )}
        </section>

        <section>
          <p class="label">{tr('settings.data')}</p>

          <Row label={tr('filebar.records', recordCount)} hint={tr('settings.exportHint')}>
            <div class="setting__buttons">
              <button class="btn" onClick={onExportCsv}>{tr('settings.csv')}</button>
              <button class="btn" onClick={onExportJson}>{tr('settings.json')}</button>
              <button class="btn" onClick={onImportJson}>{tr('sidebar.importJson')}</button>
              <button class="btn" onClick={onImportCsv}>{tr('sidebar.importCsv')}</button>
            </div>
          </Row>

          <Row label={tr('settings.attachmentBudget')} hint={tr('settings.attachmentBudgetHint')}>
            <input
              type="number"
              min="1"
              max="50"
              value={settings.attachmentBudgetMb}
              onInput={(e) => set('attachmentBudgetMb')(Number(e.currentTarget.value))}
            />
          </Row>

          <Row label={tr('settings.merge')} hint={tr('settings.mergeHint')}>
            <div class="setting__buttons">
              <button class="btn" onClick={onMerge}>{tr('sidebar.merge')}</button>
            </div>
          </Row>
        </section>

        <section>
          <p class="label">{tr('settings.configuration')}</p>

          <Row label={tr('settings.saveTransfer')} hint={tr('settings.saveTransferHint')}>
            <div class="setting__buttons">
              <button class="btn" onClick={onExportConfig}>{tr('common.save')}</button>
              <button class="btn" onClick={onImportConfig}>{tr('common.load')}</button>
            </div>
          </Row>

          <p class="note">{tr('settings.configNote')}</p>
        </section>

        </fieldset>

        <footer class="settings__foot">
          <Wordmark brand={settings.brand} class="settings__logo" />
          <div>
            {settings.copyright && (
              <p class="settings__copyright">
                {settings.copyrightUrl ? (
                  <a href={settings.copyrightUrl} target="_blank" rel="noopener noreferrer">
                    {settings.copyright}
                  </a>
                ) : (
                  settings.copyright
                )}
              </p>
            )}
            <p>
              <a
                href="https://github.com/m-dohmen/openToolbox"
                target="_blank"
                rel="noopener noreferrer"
              >
                {tr('settings.basedOn')}
              </a>
              {' · Apache License 2.0'}
            </p>
            <p>{tr('settings.runsLocally')}</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
