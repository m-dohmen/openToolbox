# AGENTS.md

Instructions for an AI assistant asked to build a tool **on the basis of openToolbox**.

Read this file completely before writing any code. It is short on purpose.

## What openToolbox is

A template that compiles to **one self-contained HTML file**. No server, no install, no network at
runtime. The file is also the database: saving writes a new HTML file with the data embedded in it.
Optional AES-256-GCM encryption, optional AI assistant that can read and — on explicit instruction —
change the data.

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

## Optional second file

`src/app.jsx` — only if the user needs something the schema cannot express: an extra sidebar
section, a computed column, a different empty state. Everything else is already generic. Resist the
urge to touch it.

Default title, subtitle, file name, colours and product name live in `DEFAULT_SETTINGS`,
`DEFAULT_COLORS` and `DEFAULT_BRAND` at the top of `src/app.jsx`. Set them to match the tool you are
building — the user can change all of them later in the settings page.

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

## Rules that are not negotiable

- **Never add a runtime dependency on the network.** No CDN links, no web fonts, no external images.
  The file must work with the network cable pulled.
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
