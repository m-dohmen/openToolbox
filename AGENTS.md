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

### Search and field filters come free

The search box above the entity tabs reads **every field of every entity** — case-insensitive,
live, with the hit count on each tab and the matches highlighted in the table. Attachments count
by file name only, reference fields by the resolved title, computed fields and the record id like
any other value. There is nothing to configure, and that is deliberate: a tool where "where does X
stand" is the most common question must not fail because a new field was never added to a search
list. A `search:` entry left over from an older schema is tolerated but **no longer read** — drop
it when you touch the file anyway.

Below the facet groups, the sidebar gains one field filter per `text`, `enum`, `number` and `date`
field that is not already a facet: contains, multi-select, from/to. Fields listed in `facets`
stay quick filters with their counts and do not appear twice. Active filters show as removable
chips above the table; an entity without filterable field types gets neither filter area nor
chips. All of it lives in the session only — none of it enters the payload, and a reload starts
clean (deliberately without `localStorage`, see the rules below).

### Calculated fields

Anything derived from other fields belongs in a `computed` field rather than in a number field the
user has to keep up to date by hand:

```js
{ key: 'score', label: 'Risk score', type: 'computed', compute: (r) => r.likelihood * r.impact }
```

`compute(record)` runs on every render. The value is **never written into the record** — a stored
derivation goes stale the moment one of its inputs changes and nobody notices. It behaves like any
other field in the table, in sorting, in search, in `totalField` and in the CSV export; it shows
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

### The examples are the fastest way in

`examples/` holds seven complete domains, each built and published under
[`docs/demos/`](https://m-dohmen.github.io/openToolbox/demos/). Before writing one from scratch,
open the closest and copy its shape:

| File | Shape worth stealing |
| --- | --- |
| `risk-register.domain.js` | The plainest single-entity domain. |
| `portfolio.domain.js` | Two record types, a reference, money, a dashboard. |
| `suppliers-certificates.domain.js` | Two record types, minimal — the reference mechanics alone. |
| `ppwr-packaging.domain.js` | Computed fields that aggregate a *child* entity; rules that force a source for every estimate. |
| `gdpr-processing.domain.js` | Almost no numbers — enums and free text; built for `mode: 'intake'`. |
| `equipment-testing.domain.js` | Everything derived from dates: due date from interval, days left, the red flag. |
| `renovation-quotes.domain.js` | Money across two entities; the awarded sum is read from the accepted quote, never typed. |
| `school-trip.domain.js` | States rather than numbers, and a domain that argues for encryption. |

Copy one over `src/domain.js` and build to see the whole app change.

Each demo also carries a **build prompt** —
`docs/demos/<slug>/generating_prompt_<lang>.md`, seven languages — which states the same domain as a
functional specification. If a user hands you one of those, it is complete: follow it and you get
the demo back. They are generated from the domains by `npm run prompts`, so never edit one by hand;
change the example and regenerate.

### Attachments

`type: 'attachment'` stores an uploaded file in the record itself, base64 in the payload, and it
travels with the file like everything else:

```js
{ key: 'evidence', label: 'Evidence', short: 'File', type: 'attachment' }
```

**The budget is part of the feature, not an extra.** Attachments break the one promise this shape
rests on — a file you can send by email. Without a hard limit the third scan turns a 200 KB tool
into a 30 MB attachment no gateway will pass, and nobody would notice. So:

- A meter sits in the dark bar showing used-of-limit, and turns amber past 85 %.
- The limit is `attachmentBudgetMb` in `DEFAULT_SETTINGS`, 5 MB by default, editable in
  Settings → Data. An upload that would exceed it is **refused when the record is applied**, with
  the numbers in the message — not tolerated and discovered later.
- One file is capped at 4 MB regardless.

Three things attachments deliberately do not do: they never reach the AI (the model sees only the
file name — one embedded PDF as base64 would exceed the whole context window), the CSV export
carries the file name and not the content, and the stored MIME type is never used to render
anything. Downloads always go through a blob with a `download` attribute.

Use them where the tool is about evidence — audit findings, certificates, invoices. Do not add an
attachment field "just in case": every one of them is an invitation to make the file unsendable.

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

## The start page

A tool that lands straight on a table assumes the recipient already knows what it is. Usually they
do not — they want a sentence on what this is for, who maintains it and where to ask.

`DEFAULT_HOME` at the top of `src/app.jsx` holds that text, and the app opens on it whenever it is
not empty. **Write it for the tool you build.** It is the first thing your user's recipients see,
and the shipped default talks about openToolbox rather than about their tool.

The text is a small Markdown subset — `#`/`##`/`###`, `-` and `1.` lists, `>` quotes, `---`,
`**bold**`, `*italic*`, `` `code` `` and `[text](url)`. Everything else stays plain text: it is
parsed into a tree and rendered as nodes, never inserted as HTML, so nothing in that field can
become markup in a file that gets passed around.

Two things to know:

- **Editing happens on the page itself**, and the settings lock covers it. Protect the settings and
  the *Edit this page* button becomes a note saying so — otherwise the protection would be half a
  measure, since this is where it says what the tool is.
- **The text lives with the settings**, so it sits outside the encrypted envelope and stays readable
  before anyone unlocks the file. That is right for "what is this" and wrong for anything
  confidential. Say so if the tool is encrypted.

Set it to `''` when a start page would only be a click in the way — a tool someone opens twenty
times a day does not need one.

## Optional: a guided entry wizard

The list plus the edit form assume the recipient knows the tool. Someone who gets the file in order
to report *one* thing should not have to sort out a table, a sidebar and seventeen fields first. A
`WIZARD` export gives them a sequence of short steps instead — without it the view does not exist:

```js
export const WIZARD = {
  title: 'Report a finding',
  intro: 'Four short steps. Nothing is written until the last one.',
  steps: [
    { id: 'what', label: 'What', fields: ['title', 'area', 'note'] },
    { id: 'who', label: 'Who and when', fields: ['owner', 'due', 'status'],
      when: (drafts) => drafts.records.severity !== 'low' },
    { id: 'bulk', label: 'Several at once', type: 'csv' },
    { id: 'check', label: 'Check', type: 'review' },
  ],
  done: { message: 'Thank you — that is recorded.', allowAnother: true },
}
```

Four step types, which is all it takes generically:

- `fields` — a subset of the schema fields, rendered by the same machinery as the edit form, with
  the same validation rules. A step only reports objections about the fields it actually shows.
- `csv` — the existing import as a step, for bulk entry. It feeds **the same run**: rows are held
  and created together with the draft at the end, so abandoning the wizard leaves nothing behind.
- `review` — a summary generated from the schema. Nothing to configure.
- the closing screen, built from `done`. `allowAnother: false` ends the run for good.

`when(drafts)` hides a step that does not apply; `drafts` is keyed by entity, so with a single
record type it is `drafts.records`.

With `ENTITIES`, a step carries `entity: '<key>'` and one run can create a supplier and then its
certificates. **The drafts get their ids at the start of the run**, which is what lets a reference
field in step two point at the record from step one — the dropdown there offers the draft alongside
the saved records.

### Intake mode

`mode: 'intake'` in `DEFAULT_SETTINGS` opens the file straight into the wizard and hides the list,
the entity tabs and the "New …" button. That turns the same file into a form you send out: the
recipient fills it in, saves, mails it back. Without a `WIZARD` export the switch does nothing.

Set it when the recipient's job is to report, not to browse. Leave it on `'workbench'` — the
default — when they also need to see and edit what is already there.

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

### Due dates on the dashboard

Set `dueDate` on a schema to a field key — a plain `date` field or a `computed` one, the same way
`totalField` points at a number field — and a "Fälligkeiten"/"Due dates" widget appears at the top
of the dashboard automatically:

```js
export const SCHEMA = {
  // …
  dueDate: 'review',   // field key holding the date to track, or leave unset
}
```

This is deliberately **not** a `DASHBOARD` export. Fälligkeitssteuerung is the most common reason a
consultant opens one of these tools at all — it should not depend on someone also having built stat
tiles. So the widget shows up on its own even without a `DASHBOARD` export, as soon as any entity
declares `dueDate`. Domains that never mention it see exactly their old dashboard, tiles or none.

Three groups, hidden when empty: **overdue** (before today), **this week** (Monday through Sunday of
the current local calendar week) and **the next 30 days** after that Sunday. Group boundaries are
fixed in this version, not configurable — a setting here would be one more thing to explain to a
recipient who just wants to know what is late. A record where `isDone(record)` is true is excluded
from all three groups; a finished item is not "due" in any group, and counting it as overdue would
flag closed work as outstanding. Comparisons run on local calendar dates parsed from the field's ISO
string, not on the UTC instant `new Date('2026-08-20')` would give you — that constructor lands on
the previous day everywhere west of Greenwich, which is exactly the kind of off-by-one nobody
notices until a steering committee meeting starts with the wrong item flagged red.

With `ENTITIES`, the widget aggregates across every entity that declares `dueDate` — a portfolio
tool can flag an overdue milestone and an overdue action item in the same list. Clicking an entry
switches to that record's entity and opens it, using the same navigation as a reference chip.

The widget's clock is a parameter, not a call to `new Date()` buried inside it — an "overdue" bucket
that can only be exercised against whatever day the test happens to run on is not really tested. You
will not normally touch this; it matters if you extend the widget yourself.

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

## Merging a copy that came back

The one thing this shape does not solve on its own: send the file to five departments, get five
files back. Since v0.4.0 the tool reads a second copy of itself and compares record by record —
**Merge a file** in the sidebar, or Settings → Data.

Nothing about it needs configuring; it works off the schema and the identifiers. What you should
tell the user:

- It is for **two copies of the same tool**, not two arbitrary files. Same schema, same ids. A
  record type the reading file does not know is named and skipped.
- Three groups, each with checkboxes: records only in the other file, records with different values
  (shown field by field, before and after), and records missing there.
- **Deletions are not preselected.** The other copy being older looks exactly like a record having
  been deleted, and only one of those two readings destroys data. Everything else is preselected,
  because taking the changes is why anyone opens this dialog.
- An encrypted counterpart asks for *its* passphrase. Two files, two secrets.

Nothing is written to disk by merging — it changes the working set, and the file still has to be
saved afterwards.

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

  Since v0.5.0 each entry also carries **the field changes since the last save**, worked out
  automatically: which record, which field, before and after, plus records created and deleted. The
  entry answers "what happened to A-1041 between 1.2 and 1.4", which is the question that actually
  gets asked. Deriving it rather than asking for it is the point — a log that depends on the
  writer's discipline is incomplete exactly when it is needed. The record form shows the same trail
  filtered to that one record. Capped at 200 changes per entry, with the remainder counted rather
  than silently dropped.

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
