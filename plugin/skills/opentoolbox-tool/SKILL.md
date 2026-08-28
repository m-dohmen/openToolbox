---
name: opentoolbox-tool
description: >-
  Build a small internal tool that ships as one self-contained HTML file — a register, a tracker, a
  checklist, an audit log — using the openToolbox template. Use when someone wants a lightweight
  tool for tracking records that has to travel by email or USB stick and run by double-click without
  a server, install or database, or when they mention openToolbox by name.
---

# Build a tool with openToolbox

openToolbox compiles to **one self-contained HTML file** that is both the application and the
database. Saving writes a new HTML file with the records embedded in it.

Your job is to run this from the first sentence to a finished, renamed file the user can send to
someone. Follow the steps in order.

## 1. Get the template

Check whether you are already inside an openToolbox checkout — `src/domain.js` and `AGENTS.md` both
present at the repository root. If yes, work there.

Otherwise ask where the tool should be built, then:

```bash
git clone https://github.com/m-dohmen/openToolbox <target>
cd <target> && npm install
```

If `git` or `npm` are unavailable, stop and say so plainly — the build needs both.

## 2. Read AGENTS.md before writing anything

`AGENTS.md` at the repository root is the authority on **what** to write: the `SCHEMA` shape, the
field types, calculated fields, multiple entities, dashboards, and the rules that break a
single-file build if ignored. Read it in full. This skill covers the **procedure** and does not
repeat that knowledge — where the two ever disagree, `AGENTS.md` wins.

`examples/` holds eight complete domains — from a plain single-entity risk register to multi-entity
domains with references and computed aggregates (`portfolio`, `ppwr-packaging`, `renovation-quotes`,
`suppliers-certificates`). Six of them are published as live demos under
[`docs/demos/`](https://m-dohmen.github.io/openToolbox/demos/). Read whichever is closest to the
request before writing your own.

## 3. Interview the user — one round, then build

Do not guess the domain. Ask everything at once and let them answer in one go:

1. **What is being tracked?** One record — what is it called, singular and plural?
2. **Which fields?** Name, type (`text`, `enum`, `date`, `number`), and for enums the allowed values.
3. **Which field is the headline** in the list, and which fields belong in the table at all?
4. **Any "overdue" or "done" logic?** A date that can lapse, a status that closes an item.
5. **Who receives the finished file**, and are they the ones who will change it later? — this decides
   the handover settings in step 6.
6. **Should the AI assistant be part of it?** It ships switched off; they can enable it.

If they already gave enough detail, skip the questions and state the assumptions you made instead.

Three things to raise yourself, because users rarely ask for them and all three are cheap:

- **A calculated field** (`type: 'computed'`) wherever a number would otherwise be kept up to date by
  hand — a score, days remaining, a budget variance. It is recomputed (memoised per record) and
  never stored, so it cannot go stale. See `AGENTS.md` for the shape and the rules around metric
  tiles.
- **A dashboard** (`DASHBOARD` export) whenever the tool's output will be shown to anyone — a
  steering committee, a client, a review. Without the export the view does not exist.
- **The due-date widget** (`dueDate` on the schema) whenever the answer to interview question 4 was a
  date that can lapse — overdue items, upcoming reviews, expiring approvals. See `AGENTS.md` for the
  field shape; it shows up on the dashboard on its own, no `DASHBOARD` export required.
- **Metric tiles** (`metrics` on the schema) whenever the tool is shown to someone who wants the
  overview numbers first — how many records, what they weigh in total, what averages out. See
  `AGENTS.md` for the closed catalog; like the due-date widget, a declaration alone unlocks the
  dashboard view.
- **Dashboard charts** (`DASHBOARD.charts`) whenever the steering-committee view needs more than
  numbers — a bar/donut over an enum, or a monthly line over a date field. The `DASHBOARD` export
  can carry a `charts` array alongside `tiles` (the old kinds keep working). The renderer lives in
  `src/lib/charts.js`; the field schema (the three `kind`s, the closed `aggregate` catalog, the
  rejection tiles) is documented in `AGENTS.md` under "Inline-SVG charts in the dashboard" — do
  not duplicate it here.
- **Saved views** (`views` on the schema) whenever the same combination of search, filters and
  sort gets rebuilt by hand every time the file opens — "my open items", "overdue this quarter".
  They ship as a dropdown at the list head; recipients capture their own under the same names,
  stored in the data block. Merge of two files is by name, last write wins. The shape and the
  start-view flag are in `AGENTS.md`; do not copy them here.

If they have a spreadsheet of real data, ask for a few header rows: naming the fields the way their
columns are named makes the built-in CSV import map them correctly on the first try. Do **not** paste
their data into `seed()` — `seed()` holds demo records, and their data goes in through
`Import CSV → replace all`.

## 4. Write the domain and the defaults

- `src/domain.js` — the only file that has to change. Everything domain-specific lives there.
- `DEFAULT_SETTINGS`, `DEFAULT_COLORS`, `DEFAULT_BRAND` at the top of `src/app.jsx` — set `title`,
  `subtitle`, `fileStem` and the colours to match the tool.

Resist touching anything else. `src/app.jsx` beyond those constants is generic on purpose.

## 5. Build and check

```bash
npm run build     # → dist/index.html, one file
npm test          # headless smoke test; downloads Chromium on first run
```

Then **open `dist/index.html` yourself and look at it** before handing it over. The seed records
should render, the filters should count, and the tool should look like what was asked for. If you
have a browser tool available, use it; otherwise say that you did not visually verify.

## 6. Set the handover switches — your call, not the user's

Four defaults are right for a template and wrong for a finished tool. Decide each one and say what
you decided:

- **`copyright`** defaults to `'© openToolbox'`. Set it to whoever owns the tool — your user or
  their client. The `based on openToolbox` line underneath stays either way.
- **`links`** ships with one header link pointing at the openToolbox repository. Replace it with
  something of theirs, or remove it.
- **`examplePrompts`** ships **on**: hint boxes with ready-made prompts at every place worth
  changing. Keep them while the tool is still taking shape; set `examplePrompts: false` when the
  recipient only enters data.
- **`auditLog`** ships **on**: one entry per save with a short dialog asking what changed. Keep it
  where changes must be justifiable; switch it off for a scratch tool.

If the recipient is not the person who built the tool, also suggest **Settings → Security → Protect
settings**. It disables every control on that page against accidental change. Say plainly what it is
not: whoever holds the file holds the code, so it guards against slips, not against people.

## 7. Deliver

Rename `dist/index.html` to something meaningful and tell the user:

- double-click to open, no server needed
- `Ctrl`/`Cmd`+`S` or the Save button writes a **new** HTML file containing the data
- nothing is auto-saved; the amber dot in the top bar means unsaved changes
- many mail gateways strip `.html` attachments — send it zipped
- the shipped records are demo data; their own goes in via `Import CSV`
- **the file counts its own opens.** One GET on open, carrying only the kind of tool — no records,
  no field contents, no file name. It is preset to the template author's endpoint and is a labelled
  switch in Settings → Security, where they can point it at their own or turn it off. Say this at
  handover rather than letting someone find it in a network log later. For an air-gapped machine or
  a client that reviews every connection, set `analytics: false` before building.

## When openToolbox is the wrong answer

It is a records-with-fields tool. If the request is really a calculator, a canvas, a diagram editor
or a wizard, say so plainly and offer either a stripped-down variant — keeping the file persistence,
encryption and AI plumbing, replacing the list view — or a different starting point. Do not force an
unrelated shape into the table.
