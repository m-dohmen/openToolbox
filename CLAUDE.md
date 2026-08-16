# AGENTS.md

Instructions for an AI assistant asked to build a tool **on the basis of openToolbox**.

Read this file completely before writing any code. It is short on purpose.

> **If you are editing this file:** `plugin/skills/opentoolbox-tool/SKILL.md` is an installable
> skill for Claude Code and Codex that walks a user through the same build. The split is
> deliberate — **this file holds the knowledge** (schema shape, field types, the rules that break a
> single-file build), **the skill holds the procedure** (fetch, interview, build, verify, hand
> over), and the skill defers to this file where they overlap. Do not copy schema documentation
> into the skill; two descriptions of the same thing drift apart.

## What openToolbox is

A template that compiles to **one self-contained HTML file**. No server, no install, nothing loaded
from the network at runtime. The file is also the database: saving writes a new HTML file with the
data embedded in it. Optional AES-256-GCM encryption, optional AI assistant that can read and — on
explicit instruction — change the data. One usage counter that is on by default and switchable off
(see below).

You are not building an app from scratch. You are **swapping one file** and rebuilding.

## Before you write code: ask

Do not guess the domain. Ask the user, in one round:

1. **What is being tracked?** One record — what is it called, singular and plural?
2. **Which fields?** Name, type (`text`, `enum`, `date`, `number`), and for enums the allowed values.
3. **Which field is the headline** in the list, and which fields belong in the table at all?
4. **Any "overdue" or "done" logic?** A date that can lapse, a status that closes an item.
5. **Should the AI assistant be part of it?** It ships switched off; the user can enable it.

If the user gave enough detail in the prompt, skip the questions and state the assumptions you made.

## The one file you change

`src/domain.js` — everything domain-specific lives there and nowhere else. It exports:

| Export | Purpose |
| --- | --- |
| `SCHEMA` | Field definitions plus presentation hints. Drives the table, the form, the sidebar filters, the CSV columns, the AI instructions and the validation of AI-proposed changes. |
| `uid()` | Generates a record id. Use a readable prefix. |
| `emptyRecord()` | A blank record with sensible defaults. |
| `seed()` | 8–12 realistic demo records so the file is not empty on first open. |
| `isDone(r)` | Record no longer counts towards the open total. |
| `isOverdue(r)` | Record is flagged in red. Return `false` if the concept does not apply. |
| `formatDate(s)` | ISO string to display string. |

### SCHEMA shape

```js
export const SCHEMA = {
  idField: 'id',
  singular: 'risk',            // used in buttons: "New risk"
  plural: 'risks',             // used in the overview tile
  titleField: 'name',          // leading column, rendered with emphasis
  subField: 'category',        // second line under the title, or null
  list: ['name', 'owner', 'review', 'likelihood', 'impact'],   // table columns, in order
  facets: ['likelihood', 'category'],   // enum fields that become sidebar filters
  search: ['id', 'name', 'owner'],      // fields the search box looks at
  totalField: 'impact',                 // number summed in the overview, or null
  fields: [
    { key: 'name', label: 'Risk', type: 'text', required: true },
    { key: 'category', label: 'Category', type: 'enum', values: ['Operational', 'Legal', 'IT'] },
    { key: 'review', label: 'Review date', short: 'Review', type: 'date' },
    { key: 'impact', label: 'Impact score', short: 'Score', type: 'number' },
    { key: 'mitigation', label: 'Mitigation', type: 'text', long: true },
  ],
}
```

`short` is the table header when the full label is too wide. `long: true` renders a textarea in the
form. Field types are enforced when the AI proposes changes — an enum value outside `values` is
rejected and reported, so keep `values` accurate.

### Calculated fields

Anything derived from other fields belongs in a `computed` field rather than in a number field the
user has to keep up to date by hand:

```js
{ key: 'score', label: 'Risk score', type: 'computed', compute: (r) => r.likelihood * r.impact }
```

`compute(record)` runs on every render. The value is **never written into the record** — a stored
derivation goes stale the moment one of its inputs changes and nobody notices. It behaves like any
other field in the table, in sorting, in `search`, in `totalField` and in the CSV export; it shows
read-only in the form; and both the user and the AI are prevented from setting it (the AI is told
it is read-only and a write is rejected by name).

Use it for scores (`likelihood × impact`), remaining time, percentages, budget variance — anything
a consultant would otherwise recompute in a spreadsheet and paste back in wrong.

### Validation rules

`required: true` on a field is enforced. Beyond that, conditions **between** fields belong in
`rules` on the schema — a per-field type check cannot see them:

```js
rules: [
  {
    when: (r) => r.status === 'done',        // optional; without it the rule always applies
    require: ['cost'],                       // shorthand: these fields must be filled
    check: (r) => Number(r.cost) > 0,        // optional predicate; true means fine
    fields: ['cost'],                        // which fields to flag; defaults to `require`
    message: 'A closed item needs its actual cost.',
  },
]
```

The point is the single place it runs. **The form, the CSV import and AI-proposed changes all pass
through the same check** — one rule in the schema hardens all three at once instead of being
retrofitted in three places. In the form the objection appears under the offending field and the
save is refused; in the import the row is skipped and named; the AI is told the `message` up front
and gets it back as the reason if it proposes something that violates it.

Two details worth knowing when you write rules:

- **A number `0` counts as filled.** `require` treats empty string, `null` and `undefined` as
  missing, nothing else — a cost of zero is usually a real answer.
- **`message` is your text, in your language**, like the field labels. Only the built-in
  "X is required." comes from the interface translation.

Write rules for the things a reviewer would otherwise catch by eye: an item in progress with no
owner, a closing date before the start date, a mandatory justification on a rejection. Do not
recreate type checks — `enum`, `date` and `number` are already enforced.

`examples/risk-register.domain.js` is a complete working example. Copy it over `src/domain.js` and
build to see the whole app change.

## Multiple entities and relationships

Most tools need only one record type — stick with the single `SCHEMA` export above. Reach for this
only once there are genuinely two or more kinds of records that reference each other, e.g.
"suppliers" and "certificates", where a certificate always belongs to a supplier.

Export `ENTITIES` instead of `SCHEMA`, one entry per record type, each shaped like the single-entity
exports above but nested under a key:

```js
export const ENTITIES = {
  suppliers: {
    schema: { idField: 'id', singular: 'supplier', plural: 'suppliers', titleField: 'name', /* … */ },
    uid: () => 'S-' + /* … */,
    emptyRecord: () => ({ /* … */ }),
    seed: () => [ /* … */ ],
    isDone: () => false,
    isOverdue: () => false,
  },
  certificates: {
    schema: {
      idField: 'id', singular: 'certificate', plural: 'certificates', titleField: 'title',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'supplierId', label: 'Supplier', type: 'reference', entity: 'suppliers', required: true },
        // …
      ],
    },
    uid: () => 'C-' + /* … */,
    emptyRecord: () => ({ /* … */ }),
    seed: () => [ /* … */ ],
    isDone: () => false,
    isOverdue: (r) => r.expiry && r.expiry < today,
  },
}
export const formatDate = (s) => /* … */   // one shared export, same as the single-entity shape
```

A `type: 'reference'` field points at another entity via `entity: '<key>'`. The app renders it as a
dropdown of that entity's records (showing the title field, storing the id) in the edit form, and
as a clickable chip resolving to the referenced record's title in the table — clicking it switches
to that entity and opens the record. Deleting a record that's still referenced by another entity is
blocked, and the message names what references it. The AI assistant's instructions and proposal
validation are reference-aware too: it can name the target record by id or by its title text.

`examples/suppliers-certificates.domain.js` is a complete working example — copy it over
`src/domain.js` and rebuild to see a two-entity tool with a working relationship between them.

Everything else — CSV/JSON export, encryption, branding, the interface language toggle — already
understands this shape without any further change.

## Optional: a dashboard

Consultants analyse and then present. If the tool is for anything that gets shown to a steering
committee, add a `DASHBOARD` export — without it the view simply does not exist:

```js
export const DASHBOARD = {
  tiles: [
    { type: 'stat',  measure: 'count', label: 'Risks', caption: 'in this file' },
    { type: 'stat',  measure: 'impact', filter: (r) => !isDone(r), label: 'Open impact' },
    { type: 'donut', groupBy: 'likelihood' },
    { type: 'bar',   groupBy: 'category', measure: 'impact', label: 'Impact by category' },
  ],
}
```

- `stat` — one number. `measure`: `'count'` or a field key whose values are summed. `filter(record)`
  narrows the set first. `label` and `caption` are free text.
- `bar` — one bar per value of `groupBy` (an enum field). `measure` as above.
- `donut` — the same data as a ring with a legend.
- `entity` — only needed with `ENTITIES`; defaults to the entity being viewed.

Drawn without a charting library: bars are CSS widths, the ring is one SVG circle with
`stroke-dasharray`. Category colours are derived from the tool's accent colour, so a rebranded tool
recolours its dashboard automatically. Tiles show their entity's **full** record set, not the
filtered table view.

Both the list and the dashboard have a print stylesheet — the browser makes the PDF, everything
interactive drops away. Worth mentioning at handover; it is how these end up as meeting appendices.

## Optional second file

`src/app.jsx` — only if the user needs something the schema cannot express: an extra sidebar
section, a computed column, a different empty state. Everything else is already generic. Resist the
urge to touch it.

Default title, subtitle, file name, colours and product name live in `DEFAULT_SETTINGS`,
`DEFAULT_COLORS` and `DEFAULT_BRAND` at the top of `src/app.jsx`. Set them to match the tool you are
building — the user can change all of them later in the settings page.

### The dark bar at the top

Two more settings live there, both aimed at a tool that leaves your hands:

- **`tagline`** — the text after the file name. Empty means the translated standard line, which
  follows the interface language; set it and your text wins in every language. Good place for the
  client, the department or the classification (`Muster GmbH · internal`).
- **`links`** — up to five icons on the right of the bar, each `{ icon, url, label }`, opening in a
  new tab. Ships with one entry pointing at the openToolbox repository. **Replace it when you
  deliver**, the same way you replace `copyright`: the recipient's repository, their Confluence
  space, their ticket board — a link back to the template is rarely what they need there.

  ```js
  links: [
    { icon: '<svg viewBox="0 0 16 16">…</svg>', url: 'https://intranet.example/qm', label: 'QM handbook' },
  ]
  ```

  `icon` is inline SVG and runs through the same sanitiser as the logo — an empty string draws a
  neutral chain link. `url` accepts `http`, `https` and `mailto`; a missing scheme is completed to
  `https`, and anything else (`javascript:`, `data:`) is dropped without display. `label` becomes
  the tooltip and the accessible name, so write one.

## Getting the user's real data in

You do not have to write an importer, and you should not paste the user's data into `seed()`.
The built file imports CSV itself: the user picks a file, assigns columns to fields in a dialog,
and every cell runs through the same type check as an AI-proposed change. Separator, quoting and
BOM are detected. Identifiers are always assigned by the app, never read from the file.

Two consequences for the schema you write:

- **Field `label`s drive the automatic column mapping.** A column heading that matches a field's
  label or key — ignoring case and punctuation — is preselected. If the user showed you a sample
  of their spreadsheet, name the fields the way their columns are named and the mapping is right
  on the first try. Anything unmatched the user assigns by hand, so a mismatch costs a click,
  not a failed import.
- **Keep `values` of an enum aligned with what their data actually contains.** Enum matching is
  tolerant about case and spacing, but `erledigt` will not match `done`. Either use their wording
  as the enum values, or expect those cells to be reported as objections.

`seed()` stays what it is: 8–12 *demo* records so the file is not empty on first open. Tell the
user they can replace them via `Import CSV` → *replace all*.

## Build and deliver

```bash
npm install
npm run build          # produces dist/index.html — one file, self-contained
npm test               # optional: headless smoke test, needs a chromium download
```

Deliver `dist/index.html`. Rename it to something meaningful. Tell the user:

- double-click to open, no server needed
- Ctrl/Cmd+S or the Save button writes a **new** HTML file containing the data
- nothing is auto-saved; the amber dot in the top bar means unsaved changes
- many mail gateways strip `.html` attachments — send it zipped
- their own data goes in via `Import CSV`; the shipped records are demo data
- the version badge and the change log are theirs to fill — the dialog on save asks for both
- the file counts its own opens (Settings → Security), preset to the template author's endpoint —
  they can point it at their own or switch it off; see below

## Before you hand over: two switches

Both default to **on** because the template's job is to teach. A finished tool for a client is a
different situation, and this is a judgement call you should make yourself rather than leave to
the recipient:

- **`examplePrompts`** — hint boxes with ready-made prompts at every place worth changing. Perfect
  while the tool is still taking shape, noise for someone who only enters data. Set
  `examplePrompts: false` in `DEFAULT_SETTINGS` when you deliver a finished tool, or tell the user
  where the toggle is (Settings → Appearance).
- **`auditLog`** — one entry per save, with a short dialog asking what changed. Keep it on wherever
  changes have to be justifiable (audits, regulated processes, anything with a steering committee).
  Switch it off for a scratch tool where the dialog is just friction.

`version` is empty by default. Set it in `DEFAULT_SETTINGS` if the tool has a meaningful starting
version; otherwise leave it and let the user set one at the first save.

**Set `copyright` to whoever owns the tool.** It defaults to `'© openToolbox'` with a link to the
template, which is right for a fresh checkout and wrong for anything you deliver — the notice at the
bottom of the settings page belongs to your user or their client, not to the template it was built
from. Set `copyright` and `copyrightUrl` in `DEFAULT_SETTINGS`, or tell the user where to change them
(Settings → Application). The `based on openToolbox` line underneath stays either way and is not
editable.

## Locking the settings against accidental change

A tool that goes to someone who only enters data has a settings page they have no reason to open —
and every reason to leave alone. One stray click on a colour, an endpoint or the file name and the
next save carries it forward. Settings → Security → *Protect settings* asks for a word and disables
every control on that page; the fields stay visible with their values readable, and the same word
enables them again for the current session. Reopening the file locks them again.

Suggest it whenever the recipient is not the person who built the tool. Two things to say plainly
when you do:

- **This guards against slips, not against people.** Whoever holds the file holds the code; the
  lock entry can be removed from the payload. It is a lid on a switch, not a lock on a door. If
  something in the file genuinely must not be read, that is what the encryption is for.
- **The word is not a password.** It is stored as a salted SHA-256 digest so it does not sit in the
  file in plain text, but the input field shows it openly on purpose — nobody should reuse a real
  password here, and `123` is a perfectly good choice.

You can preset it: `lock` in `DEFAULT_SETTINGS` takes `null` (open, the default) or a
`{ salt, hash }` pair. Producing that pair by hand is rarely worth it — protect the file once
through the settings page and save.

## The usage counter — mention it, don't hide it

A built file sends one GET on open, to the endpoint in `settings.analyticsUrl`, carrying only the
kind of tool (`SCHEMA.singular`). No records, no field contents, no file name.

**Tell the user it exists when you hand over the file.** If the tool is going to a regulated
environment, or gets passed on to their client, say so plainly and point at Settings → Security,
where the endpoint is spelled out and the switch sits. Two honest sentences at handover cost
nothing; a counter someone discovers later in a network log costs trust.

Set `analytics: false` in `DEFAULT_SETTINGS` (`src/app.jsx`) when building for an environment where
outbound traffic is a problem at all — an air-gapped machine, a client that reviews every
connection. That is a judgement call you may make yourself; do not quietly leave it on and hope.

## Rules that are not negotiable

- **Never add a runtime dependency on the network.** No CDN links, no web fonts, no external images.
  Everything needed to render must be inlined; the file must work with the network cable pulled.
  The usage counter is the single, documented, switchable exception — do not add a second one.
- **Never use `localStorage` or `IndexedDB`** for the data. Both are unreliable under `file://`.
  The embedded payload is the storage mechanism.
- **Keep the build single-file.** Do not add a second entry point; `vite-plugin-singlefile` supports
  exactly one.
- **Do not set `removeViteModuleLoader: true`** in the Vite config. It silently empties the inlined
  script and produces a 9 KB file that renders nothing.
- **Do not weaken the SVG sanitiser or the action validation.** Both exist because the output file
  gets passed around.

## When the user wants more than a list

openToolbox is a records-with-fields tool. If the request is a calculator, a canvas, a diagram
editor or a wizard, say so plainly and offer either a stripped-down variant (keep the file
persistence, encryption and AI plumbing, replace the list view) or a different starting point. Do
not force an unrelated shape into the table.
