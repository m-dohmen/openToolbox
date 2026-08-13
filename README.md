<img src="docs/logo.svg" alt="openToolbox logo" width="96" height="96">

# openToolbox

**Ship a working tool as a single HTML file. No server, no install, no network.**

openToolbox is a template for small internal tools that need to travel — by email, USB stick or
shared drive — and run by double-click on a locked-down corporate laptop. The file *is* the
application and the database at the same time. Saving writes a new HTML file with the data embedded
in it.

It is built for one workflow in particular:

> "Build me a tool for tracking supplier audits, based on openToolbox."

Point an AI assistant at this repository and it has everything it needs — the framework, and
[`AGENTS.md`](AGENTS.md) telling it exactly what to ask and which file to change.

---

**Single file · database in the file · optional AES-256 encryption · optional AI assistant ·
brandable (colours, logo, name) · bilingual interface (English, German) · light & dark mode.**

## What you get

- **One file.** ~90 KB, self-contained. Double-click, it runs. Pull the network cable, it still runs.
- **The file is the database.** Save writes a new HTML file with the records embedded. No backend,
  no browser storage, no sync.
- **Optional encryption.** AES-256-GCM, key derived through PBKDF2 with 310,000 rounds. Without the
  passphrase the file is a blob.
- **Optional AI assistant.** Point it at any OpenAI-compatible endpoint. It reads the data, takes
  file attachments as extra context and — on explicit instruction — proposes changes you approve
  before they are applied.
- **Brandable.** Five colours, product name and an SVG logo, all editable in the app and stored with
  the file. Export the configuration once and reuse it across every tool you build.
- **Light and dark mode**, keyboard shortcuts, CSV and JSON export, responsive down to phone width.
- **Two interface languages out of the box** (English, German), a setting that travels with the
  file. Adding a third is a small, mechanical change — see [Interface languages](#interface-languages).

## Quick start

```bash
git clone https://github.com/m-dohmen/openToolbox
cd openToolbox
npm install
npm run build     # → dist/index.html
```

Open `dist/index.html` in a browser. That is the whole thing.

## Building your own tool

Everything domain-specific lives in **one file**: `src/domain.js`. Swap it, rebuild, done.

```js
export const SCHEMA = {
  singular: 'risk',
  plural: 'risks',
  titleField: 'name',
  list: ['name', 'owner', 'review', 'likelihood', 'impact'],
  facets: ['likelihood', 'category'],
  fields: [
    { key: 'name', label: 'Risk', type: 'text', required: true },
    { key: 'category', label: 'Category', type: 'enum', values: ['Operational', 'Legal', 'IT'] },
    { key: 'review', label: 'Review date', type: 'date' },
    { key: 'impact', label: 'Impact score', type: 'number' },
  ],
}
```

That schema alone produces the table columns, the edit form, the sidebar filters, the CSV export,
the instructions sent to the AI model and the validation of anything the model proposes back.
`examples/risk-register.domain.js` is a complete working example — copy it over `src/domain.js` and
rebuild to watch the entire app change.

## Using it with an AI assistant

Say something like:

> Build me a tool for tracking vendor certificates, based on openToolbox
> (https://github.com/m-dohmen/openToolbox).

The assistant reads [`AGENTS.md`](AGENTS.md), asks what a record looks like, writes `src/domain.js`,
runs the build and hands you the finished HTML file. `AGENTS.md` also lists the mistakes that break
a single-file build, so the assistant does not have to rediscover them.

## Why single-file

Three constraints that keep coming up in regulated and corporate environments:

- Hosting a small tool means a server, a URL, an operations owner and usually a security review.
- Installing anything requires admin rights the user does not have.
- The data must not leave the machine.

A single HTML file sidesteps all three. It is also honest about what it is: the user can read the
entire source, and there is no service that can quietly change under them.

## How persistence works

`index.html` contains an empty data block:

```html
<script id="sb-payload" type="application/json">null</script>
```

On startup the app snapshots the untouched document source. On save it replaces just that block and
writes the result. Three write paths, in descending order of comfort: the previously chosen file
(File System Access API — no dialog from the second save on), a "Save as" dialog, or the downloads
folder. Chromium gets the first, Firefox and Safari the last.

There is deliberately **no browser storage**. `IndexedDB` and `localStorage` are unreliable under
`file://` — Chrome refuses `IndexedDB` when third-party cookies are blocked, and `localStorage` is
shared across all local files in some browsers. The embedded payload works everywhere.

## The AI assistant

Switched off by default. While off, the application opens no network connection at all — there is
no second way out.

**Compatibility is negotiated, not assumed.** "OpenAI-compatible" is a family of dialects, not a
standard. Current reasoning models require `max_completion_tokens` and reject a custom temperature;
older proxies only know `max_tokens`. The client starts with the broadest variant, reads what the
endpoint objects to out of the 400 response, adapts and retries — up to six attempts. The result is
stored with the file, so the next call gets it right the first time.

**CORS is the thing that will bite you.** From a local file the origin is `null`. The endpoint has
to allow it, which in practice means putting a proxy in front (LiteLLM, API Management, a function).
Direct calls to api.openai.com will not work. The error message says so rather than leaving you with
a blank console.

**Changes are proposals, not commands.** When asked to modify data the model appends a JSON block;
the application validates every operation against the schema — unknown fields dropped, enum values
checked, ids verified, new ids assigned by the app — and shows you the list before anything is
touched. Rejected operations are named, not silently swallowed.

**Keys are not stored by default.** If AI is enabled without a stored key, the file asks for it once
on open and offers to switch the integration off instead.

## Branding

Product name, logo and five colours are editable in the settings page and travel with the file.
Uploaded SVGs are sanitised first — scripts, `on…` handlers, `foreignObject` and external references
are stripped, and you are told what was removed. Export the configuration as JSON (without records,
without the API key) and load it into every other tool you build.

## Interface languages

The interface ships in **English (default) and German**, selectable in Settings → Appearance →
Language. The choice travels with the file, exactly like the color scheme.

This is deliberately split into two layers that don't mix:

- **App chrome** — buttons, dialogs, toasts, the AI proposal review ("Updated A-123 — Status: open →
  done"). This is what the language toggle controls. It lives in one file, `src/i18n.js`: a flat
  `key → string` dictionary, one block per language.
- **Schema content** — field labels, enum values, seed data in `src/domain.js`. Whatever language you
  wrote them in is what stays on screen, regardless of the interface language. A German-only tool
  keeps its German column headers ("Fälligkeit", "Zuständig") even with the toggle set to English —
  translating live business data isn't a UI toggle's job, and mixing the two would make the schema
  layer depend on a locale it doesn't know about.

### Adding a language

Since the whole mechanism sits in one file with every string already translated once, adding a
language is small enough to hand an AI assistant as a single instruction:

> Add Italian as an interface language.

Everything it needs is right there: `src/i18n.js` documents the pattern in its header comment,
`LOCALES` and `LOCALE_LABELS` list what Settings offers, and all 229 keys in `STRINGS.en` already
have a `STRINGS.de` counterpart to translate from. Concretely, the change is:

```js
// src/i18n.js
export const LOCALES = ['en', 'de', 'it']
export const LOCALE_LABELS = { en: 'English', de: 'Deutsch', it: 'Italiano' }

const STRINGS = {
  en: { /* … */ },
  de: { /* … */ },
  it: {
    'app.settings': 'Impostazioni',
    'common.apply': 'Applica',
    // … one line per key, same shape as `en` — plain strings and small
    // functions like `(n) => `${n} record${n === 1 ? '' : 's'}`` for the
    // handful of keys that take arguments (counts, names, plurals).
  },
}
```

Nothing else in the codebase changes. Settings picks up the new option from `LOCALES` automatically,
every component already calls the generic `tr('some.key', ...args)`, and a key missing from a
work-in-progress translation falls back to English rather than breaking — so a partial translation
is safe to ship and finish later.

### How it's wired, for anyone extending it further

- `settings.locale` is a normal setting: stored with the file, defaults to `'en'`, rendered as a
  segmented control next to color scheme and row height.
- Every component builds a bound translator once — `const tr = translator(settings.locale)` — and
  calls `tr('key')` or `tr('key', ...args)` for the handful of keys that interpolate a value (a
  count, a filename, a field label).
- `src/lib/actions.js` (validating and describing AI-proposed changes) and `dialectSummary()` in
  `src/lib/ai.js` (the negotiated-dialect line in Settings) take the same `tr` — the sentences a user
  reads when reviewing an AI proposal are translated too, not just the surrounding chrome.
- What stays English on purpose: the instructions and schema description sent *to* the AI model
  (`buildInstructions`, `buildContext` in `src/lib/ai.js`). Models are most reliable in English
  regardless of the interface language, and the user never reads that text directly — only the
  model does.

## Limits worth knowing

- **Not saved means lost.** There is no autosave — without a target file there cannot be one. The
  amber dot and the tab-close prompt are the only safety net. Ctrl/Cmd+S saves.
- **One machine, one file.** No multi-user mode. Two people editing the same file produce two
  truths.
- **Mail gateways strip `.html` attachments** more often than not. Zip it or use a file transfer,
  and test the route once with a dummy before it matters.
- **Encryption protects the data, not access to the app.** Roles and views in a locally running file
  would be surface only — whoever holds the file holds the code.

## Project layout

```
src/domain.js          the only file most tools need to change
src/app.jsx            shell, list, form, save logic
src/settings.jsx       settings page
src/chat.jsx           AI assistant dock
src/brand.jsx          wordmark and uploaded logo
src/i18n.js            interface language dictionary (English, German)
src/tokens.css         colour and type primitives
src/styles.css         semantic roles and components
src/lib/payload.js     read and write the embedded data block
src/lib/crypto.js      PBKDF2 + AES-GCM
src/lib/ai.js          endpoint client, dialect negotiation, context building
src/lib/actions.js     validation and application of AI-proposed changes
src/lib/svg.js         logo sanitiser
src/lib/color.js       palette derivation and contrast check
test/smoke.mjs         end-to-end test against a real headless browser
```

## Testing

```bash
npm test
```

Runs a headless Chromium against `file://dist/index.html` and walks the whole thing: startup, edit,
save, reopen, encrypt, wrong passphrase, decrypt, dark mode, settings round-trip, AI dialect
negotiation against a mock endpoint, attachments, proposed changes with a deliberately invalid one,
key handling and the branding pipeline with a deliberately malicious SVG. Around 29 assertions.

## Contributing

Issues and pull requests welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). This is a hobby project —
responses may take a while, and there is no support commitment.

## License

Apache License 2.0. Source files carry an `SPDX-License-Identifier` header.

Dependencies: Preact (MIT), Vite (MIT), Playwright for tests only (Apache 2.0). The built file loads
nothing at runtime.

The interface ships in US English and German (see [Interface languages](#interface-languages) above)
and defaults to English; documentation is in US English; source comments are in German.
