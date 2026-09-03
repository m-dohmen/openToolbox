# Changelog

All notable changes to openToolbox are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/).

Release notes for each version live on GitHub:
<https://github.com/m-dohmen/openToolbox/releases>.

## [Unreleased]

## [0.18.0] — 2026-08-31

### Added

- `compute(record)` for fields of type `computed` runs once per record per render pass and is
  memoised on the record for the lifetime of the page. A thousand-record dataset with three
  computed fields no longer pays 3000 calls per sort/search/export, only the number of records
  that are actually new — the cache sits on a `WeakMap`, so a record edited out of the data block
  drops its cache with it
  ([#58](https://github.com/m-dohmen/openToolbox/pull/58)).
- If `compute(record)` throws, the field renders as a dash and the console sees exactly one
  warning per unique combination of entity, field, record id and error message. The table does
  not stop, the same combination does not warn twice, and a different record, field or message
  starts a fresh warning
  ([#58](https://github.com/m-dohmen/openToolbox/pull/58)).
- A computed field whose `compute` returns a number stands in for a stored number field in the
  closed `sum(field)` / `avg(field)` metric catalog, exactly the way `totalField` already accepts
  one. `validateMetrics` accepts the new combination without flagging it as non-numeric, the
  actual error probe stays in `fieldValue` so the same dash-and-warn behaviour carries over
  ([#58](https://github.com/m-dohmen/openToolbox/pull/58)).
- `AGENTS.md` and `CLAUDE.md` gained a `computed` section spelling out the memo, the warning key
  and the metric acceptance; the diff between the two remains byte-identical so the CI guard
  keeps matching
  ([#58](https://github.com/m-dohmen/openToolbox/pull/58)).
- `README.md` and `README.de.md` rewrite the computed-field paragraph to name the memo, the
  warning shape and the metric acceptance, so a reader of either long README meets the new
  behaviour without leaving the document
  ([#58](https://github.com/m-dohmen/openToolbox/pull/58)).
- The five short READMEs (`zh`/`es`/`fr`/`ja`/`pt`) carry computed fields in their feature lists
  at the same depth as the English README
  ([#61](https://github.com/m-dohmen/openToolbox/pull/61)).
- Portfolio demo's dashboard gains a "Budget left" tile that sums the `Budgetabweichung` computed
  field, demonstrating that the closed metric catalog accepts computed numbers just like stored
  ones. Eleven screenshots under `docs/screenshots/` are regenerated to mirror the table with
  the new column and the dashboard with the new tile
  ([#63](https://github.com/m-dohmen/openToolbox/pull/63)).
- The seven demo build prompts under `docs/demos/portfolio/generating_prompt_*.md` are refreshed
  so a reader in `de`/`en`/`es`/`fr`/`ja`/`pt`/`zh` meets the new metric at the same depth
  ([#63](https://github.com/m-dohmen/openToolbox/pull/63)).
- `plugin/skills/opentoolbox-tool/SKILL.md` carries the same computed-field paragraph as
  `AGENTS.md`, so the skill stays a thin pointer to the canonical documentation
  ([#58](https://github.com/m-dohmen/openToolbox/pull/58)).
- `test/smoke.mjs` adds the memo, warning, metric-acceptance, sum/avg and 1000-record cases
  proving the contract from the user's side
  ([#58](https://github.com/m-dohmen/openToolbox/pull/58)).

## [0.17.0] — 2026-08-28

### Added

- `view.board` schema declaration adds a Kanban board per entity next to the
  existing list and dashboard views. `view.board.columnField` points at an
  enum field that becomes the columns (in the order the schema declares the
  values); `view.board.cardFields` lists up to three additional fields per
  card beyond the title; `view.board.limit` caps each column with a banner
  showing the actual count, default 50 if unset
  ([#79](https://github.com/m-dohmen/openToolbox/pull/79)).
- Dragging a card between columns writes through the same `mutate` path the
  form uses, so the move lands in the Undo/Redo stack and the change log with
  one entry — the board does not invent a write surface
  ([#79](https://github.com/m-dohmen/openToolbox/pull/79)).
- Keyboard end-to-end: a focused card answers Left/Right to step between
  columns, Enter to commit, Escape to abort. The pending move lives in the
  session, never in the data block — an Escape is a no-op for Undo because
  nothing changed yet
  ([#79](https://github.com/m-dohmen/openToolbox/pull/79)).
- Touch uses the HTML5 drag-and-drop API, native on iPadOS 15.4+, so the same
  keyboard arrows cover an attached iPad keyboard and no second entry point
  is needed ([#79](https://github.com/m-dohmen/openToolbox/pull/79)).
- Read-only copies render the board but disable dragging — the same
  `settings.readOnly` flag the rest of the UI watches
  ([#79](https://github.com/m-dohmen/openToolbox/pull/79)).
- 200+ cards in a single column do not silently clip — a banner names the
  per-column limit and the actual count, with the first `limit` cards shown,
  and the rest stay reachable via the table view
  ([#79](https://github.com/m-dohmen/openToolbox/pull/79)).
- Records whose value is empty or no longer in `values` land in an
  "Unassigned" reservoir at the right of the board; a card that belongs to no
  column stays findable instead of being silently re-categorised by the first
  column ([#79](https://github.com/m-dohmen/openToolbox/pull/79)).
- Global search and field filters act on the board the same way they act on
  the table, so a filter the recipient set up keeps working when they switch
  tabs ([#79](https://github.com/m-dohmen/openToolbox/pull/79)).
- `AGENTS.md` and `CLAUDE.md` gained a `view.board` section; the diff between
  the two remains byte-identical so the CI guard keeps matching
  ([#79](https://github.com/m-dohmen/openToolbox/pull/79)).
- `README.md` and `README.de.md` carry a Kanban-board section with a
  schema example and a screenshot of the toggle, so a reader of either long
  README meets the new view mode without leaving the document
  ([#79](https://github.com/m-dohmen/openToolbox/pull/79)).
- School-trip demo activates the board with
  `view.board.columnField: 'consent'` and `cardFields: ['guardian', 'phone',
  'payment']`, so dragging a pupil's consent state between columns is the
  visible change in the live demo
  ([#80](https://github.com/m-dohmen/openToolbox/pull/80)).
- Three new screenshots `docs/screenshots/school-trip-table.png`,
  `school-trip-board.png`, `school-trip-board-table.png` show the toggle in
  both states and both side-by-side
  ([#80](https://github.com/m-dohmen/openToolbox/pull/80)).
- New `test/board.mjs` covers `validateBoardConfig`, `groupByColumn`,
  `moveRecordInBoard` (including the `coerceField` round-trip),
  `applyColumnLimit`, the audit-trail-andockung and the no-op path
  ([#79](https://github.com/m-dohmen/openToolbox/pull/79)).
- The seven demo build prompts gain a "Board" section in every shipped
  language, so a reader in `de`/`en`/`es`/`fr`/`ja`/`pt`/`zh` meets the
  feature at the same depth
  ([#80](https://github.com/m-dohmen/openToolbox/pull/80)).
- Targeted `scripts/screenshots-school-trip-board.mjs` regenerates the three
  board screenshots without touching the rest of the gallery, mirroring the
  precedent `scripts/screenshots-report.mjs` set in 0.16.0
  ([#80](https://github.com/m-dohmen/openToolbox/pull/80)).
- `README.zh.md` feature list carries a `view.board` entry, so a reader of
  the Chinese short README meets the Kanban board at the same depth as the
  English README
  ([#82](https://github.com/m-dohmen/openToolbox/pull/82)).
- `README.es.md` feature list carries a `view.board` entry, in the same
  depth as the English README
  ([#82](https://github.com/m-dohmen/openToolbox/pull/82)).
- `README.fr.md` feature list carries a `view.board` entry, in the same
  depth as the English README
  ([#82](https://github.com/m-dohmen/openToolbox/pull/82)).
- `README.ja.md` feature list carries a `view.board` entry, in the same
  depth as the English README
  ([#82](https://github.com/m-dohmen/openToolbox/pull/82)).
- `README.pt.md` feature list carries a `view.board` entry, in the same
  depth as the English README
  ([#82](https://github.com/m-dohmen/openToolbox/pull/82)).
- New wiki page `Kanban-Board.md` in the `openToolbox.wiki` repo documents
  the `view.board` activation snippet, the school-trip example, the
  keyboard and touch paths and the read-only banner
  ([`m-dohmen/openToolbox.wiki@f6bc17e`](https://github.com/m-dohmen/openToolbox.wiki/commit/f6bc17e)).
- `chart`-Block in the dashboard export next to the existing `tiles`,
  declared as `{ type: 'chart', kind: 'bar' | 'donut' | 'line', ... }`.
  `validateChart` surfaces malformed declarations as an objection tile in
  the grid instead of silently rendering nothing
  ([#81](https://github.com/m-dohmen/openToolbox/pull/81)).
- New inline-SVG chart renderer in `src/lib/charts.js` (229 lines) replaces
  the previous CSS bars and single SVG ring with one consistent renderer;
  `line` aggregates per month (`count` or `sum(field)`) and skips empty
  months instead of overdrawing, and the `sanitizeSvg` contract is
  enforced so no `script` / `on*` / external URL leaks into the renderer
  output ([#81](https://github.com/m-dohmen/openToolbox/pull/81)).
- `src/dashboard.jsx` (+234/-22) wires the renderer into the dashboard
  grid; the accent colour and both themes run without manual intervention
  and the print stylesheet switches to black-and-white hatching
  ([#81](https://github.com/m-dohmen/openToolbox/pull/81)).
- `test/charts.mjs` (229 lines, pure math — scaling, paths, aggregates,
  validation) and `test/fixtures/charts.domain.js` cover the renderer
  without a browser. `test/smoke.mjs` (+164/-3) integrates against the
  fixture with a hand-counter check, and the previous `bars__fill`
  assertion was switched to `style.fill` because the colour now lives in
  the SVG `fill` attribute. `package.json` adds `node test/charts.mjs` to
  the test chain ([#81](https://github.com/m-dohmen/openToolbox/pull/81)).
- All seven demo HTML files (`docs/demo/index.html` and
  `docs/demos/<demo>/index.html`) were rebuilt against the new bundle and
  now render the chart toggle in the dashboard view
  ([#81](https://github.com/m-dohmen/openToolbox/pull/81)).
- `AGENTS.md` and `CLAUDE.md` gained an `Inline-SVG charts in the
  dashboard`-section; the diff between the two remains byte-identical so
  the CI guard keeps matching
  ([#81](https://github.com/m-dohmen/openToolbox/pull/81)).
- `README.md` and `README.de.md` carry a dashboard section that lists
  `charts` next to `tiles`, names `kind: 'line'` as the fourth variant
  and points at `validateChart` as the objection tile. `README.zh`,
  `README.es`, `README.fr`, `README.ja` and `README.pt` each gained a
  feature-list bullet for the chart block
  ([#81](https://github.com/m-dohmen/openToolbox/pull/81)).
- `portfolio`-Demo gained a `charts` block in its `DASHBOARD` export
  next to the existing `tiles`, so the live build shows the renderer in
  use without any new copy: a `bar` chart "Projects by risk" (count over
  `risk`) and a `line` chart "Projects landing by month" (count over
  `projects.end`) — both backed by the seed data, neither typed by hand
  ([#85](https://github.com/m-dohmen/openToolbox/pull/85)).
- `docs/demo/index.html` and `docs/demos/portfolio/index.html` were
  rebuilt against the new bundle and now render the chart row in the
  portfolio dashboard; `npm run build:demo` stays diff-free across
  consecutive runs so the gallery does not need a rebuild on every
  unrelated change ([#85](https://github.com/m-dohmen/openToolbox/pull/85)).
- New screenshot `docs/screenshots/portfolio-charts.png` shows the chart
  row in the portfolio dashboard — bars and line in one clip — alongside
  the existing gallery ([#85](https://github.com/m-dohmen/openToolbox/pull/85)).
- Targeted `scripts/screenshots-portfolio-charts.mjs` regenerates the
  portfolio-charts screenshot without touching the rest of the gallery,
  mirroring the precedent `scripts/screenshots-school-trip-board.mjs`
  set in 0.17.0 and `scripts/screenshots-report.mjs` set in 0.16.0
  ([#85](https://github.com/m-dohmen/openToolbox/pull/85)).

### Not included (consciously)

- WIP-limits, swimlanes, multi-select inside the board and per-card colours
  are out of scope at this version; the schema declares only the four fields
  the board needs and no more.

## [0.16.1] — 2026-08-27

Documentation patch. Two additive changes that close a documentation gap
left by v0.16.0 — no behaviour change, no API drift, no compat impact.

### Added

- `CHANGELOG.md` linked from the version section of `README.md` and
  `README.de.md`, so a reader of either long README finds the project-wide
  change log and the GitHub release notes without leaving the document
  ([#70](https://github.com/m-dohmen/openToolbox/pull/70)).
- Same paragraph added to the five short READMEs (`zh`, `es`, `fr`, `ja`,
  `pt`), so a reader in any shipped language lands on the same hint
  ([#71](https://github.com/m-dohmen/openToolbox/pull/71)).

### Not included (consciously)

- No content change in the short READMEs beyond the new paragraph; the
  Changelog topic was deliberately not introduced into them, only linked
  where their existing structure already mentions version history.
- Wiki does not adopt the link — the Changelog topic does not exist there
  and there is nothing to point at.
- `AGENTS.md` and `CLAUDE.md` untouched, so the byte-identity check in CI
  keeps matching the previous release.

## [0.16.0] — 2026-08-27

### Added

- Sidebar action "Export a read-only copy" in the same exchange group as the
  CSV and JSON export; click downloads an HTML file named
  `<fileStem>-report-<YYYY-MM-DD>.html` with the export date baked into the
  name ([#59](https://github.com/m-dohmen/openToolbox/pull/59)).
- Header banner above the file bar on the exported copy: label, version from
  `settings.version` and the export timestamp, so a recipient sees the
  read-only signal before the table even loads ([#59](https://github.com/m-dohmen/openToolbox/pull/59)).
- `settings.readOnly: true` on the exported payload flips the whole UI into a
  hand-out variant: Save, Undo, Redo, the Wizard, AI dock, JSON/CSV import,
  Merge, bulk-select and the row-edit drawer are all hidden; the sidebar
  export action, the CSV/JSON export and reference-chip navigation stay
  reachable ([#59](https://github.com/m-dohmen/openToolbox/pull/59)).
- Source-side change-log entry "Berichtskopie exportiert" (or "Read-only
  report copy exported" in English), added in memory at click time and
  written to disk on the next save — without it nobody can tell later which
  report came from which revision ([#59](https://github.com/m-dohmen/openToolbox/pull/59)).
- Documentation section "Handing out a read-only copy" in `README.md` and
  `README.de.md`, with feature bullet in the five short READMEs
  ([#60](https://github.com/m-dohmen/openToolbox/pull/60)).
- Wiki page `Handing-Out-a-Read-Only-Copy` linked from `_Sidebar.md` and
  `Home.md`, documenting the filename scheme, the missing write surfaces
  and the change-log entry ([#60](https://github.com/m-dohmen/openToolbox/pull/60)).
- New screenshots `docs/screenshots/report-sidebar.png` and
  `docs/screenshots/report-banner.png` referenced from both main READMEs,
  so a reader sees the export entry point and the resulting banner without
  having to reproduce the flow ([#62](https://github.com/m-dohmen/openToolbox/pull/62)).
- Targeted `npm run screenshots:report` (script `scripts/screenshots-report.mjs`)
  generates the two screenshots without touching the rest of the gallery
  ([#62](https://github.com/m-dohmen/openToolbox/pull/62)).
- New smoke steps 104–111 covering the export button, the filename pattern,
  the change-log entry, the payload write flags, the banner text, the
  absence of write surfaces in the copy, the survival of CSV/JSON export
  and `Ctrl+S` being a no-op in the copy
  ([#59](https://github.com/m-dohmen/openToolbox/pull/59)).
- i18n keys for the export action, banner, toast and audit-log entry in
  English and German ([#59](https://github.com/m-dohmen/openToolbox/pull/59)).

### Changed

- `npm test` runs the same nine suites; the `smoke` suite gained the eight
  Berichtskopie steps 104–111 from PR #59, all green at the tag
  ([#59](https://github.com/m-dohmen/openToolbox/pull/59)).

### Not included (consciously)

- The export flow copies the current file as-is; there is no redact-before-share
  option. The read-only flag is the bound, and the recipient can still see
  every field their file already contained.
- No second Vite entry for the copy. Both source and export go through the
  same `buildDocument(reportPayload)` call, so CI cannot drift the two apart.
- No write-then-strip pipeline. `settings.readOnly: true` is on the copy
  before any layout is rendered; exporting does not piggy-back on save.

## [0.15.0] — 2026-08-27

### Added

- `SCHEMA.views`: schema authors can declare named combinations of query,
  filter and sort ([#65](https://github.com/m-dohmen/openToolbox/pull/65)).
- Views dropdown at the list head, plus a Settings-editor block to rename,
  delete, capture the current state as a new view, and mark any view as the
  start view. The active view mirrors to the normal UI state
  ([#65](https://github.com/m-dohmen/openToolbox/pull/65)).
- `settings.views` and `settings.startView` persist in the data block, so
  captured views and the chosen start view survive save and reopen
  ([#65](https://github.com/m-dohmen/openToolbox/pull/65)).
- `applyMerge` reconciles view lists: same name — theirs wins; disjoint
  lists — union ([#65](https://github.com/m-dohmen/openToolbox/pull/65)).
- i18n keys for views in English and German
  ([#66](https://github.com/m-dohmen/openToolbox/pull/66)).
- School-trip demo demonstrates the feature with three preset views
  (`Alle`, `Zettel ausstehend`, `Geld offen`)
  ([#66](https://github.com/m-dohmen/openToolbox/pull/66)).
- New `views` test suite covering positive merge, negative conflict,
  `applyView` mirroring, and robustness against `null` / empty input
  ([#66](https://github.com/m-dohmen/openToolbox/pull/66)).
- Wiki page `Saved-Views` documents the feature and the merge rule
  ([#66](https://github.com/m-dohmen/openToolbox/pull/66)).

### Changed

- School-trip demo + prompts rebuilt from the rebased example so the
  published demo matches the merged feature code
  ([#66](https://github.com/m-dohmen/openToolbox/pull/66)).
- `npm test` runs nine suites locally (the new `views` suite is part of the
  standard run) ([#66](https://github.com/m-dohmen/openToolbox/pull/66)).

### Not included (consciously)

- No cross-file sharing, import/export, or sync of views.
- No view-level permissions or view-based automation.
- No computed columns inside views; views read existing fields and sort by
  them, including computed fields from v0.14.0.

## [0.14.0] — 2026-08-27

Minor release: a new opt-in schema field type, `computed`, lets a value be
derived from other fields at render time instead of being maintained by hand
and stored in the payload.

### Added

- New `type: 'computed'` field. A schema entry declares `compute(record)` and
  the value is rendered like any other field — in the table, the read-only
  form field, the detail view, the CSV export and any metric tile that
  aggregates it. Sorting and validation rules that reference the field work
  the same as for stored `number` fields.
- `validateMetrics` now accepts `sum(computed)` and `avg(computed)` as well
  as the stored-field forms it already accepted. The catalogue stays closed:
  only `count`, `sum` and `avg` remain, and `sum`/`avg` are gated to numeric
  sources (which now includes `computed` returning a number). No new metric
  kind.

### Changed

- The portfolio demo gained a `Budget left` tile (`sum(variance)`) so the
  feature is visible without reading the docs.
- The form renderer treats a stored `0` as `0` (previously it showed `—`).
  Visual fix from OPEN-79 / PR #51; no value change in saved data.
- `npm test` runs eight suites locally (the `domain-swap-crash` suite is
  part of the standard run since v0.13.1).

### Not included (consciously)

- No cross-record computations. A `compute` function receives one record at
  a time; totals across the record set belong to the `metrics` block, not
  to the field.
- No computed-of-computed chains by reactive subscription. A `computed`
  field can read stored fields and other `computed` fields, but only by
  name; the memo invalidates on record identity, not on dependency tracking.
- No persistent cache. Computed values are never written to the data
  block — saving the file is byte-identical to the saved state of a schema
  without `computed` fields.
- No import path. The CSV/JSON importer rejects unknown keys and ignores
  computed keys in payloads; imported records compute on the next render.
- No AI write path. The AI assistant can read computed values but cannot
  write to a `computed` field — the field is read-only in the form and
  absent from the AI's allowed-keys list.

[Unreleased]: https://github.com/m-dohmen/openToolbox/compare/v0.18.0...HEAD
[0.18.0]: https://github.com/m-dohmen/openToolbox/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/m-dohmen/openToolbox/compare/v0.16.1...v0.17.0
[#79]: https://github.com/m-dohmen/openToolbox/pull/79
[#80]: https://github.com/m-dohmen/openToolbox/pull/80
[#81]: https://github.com/m-dohmen/openToolbox/pull/81
[#82]: https://github.com/m-dohmen/openToolbox/pull/82
[#85]: https://github.com/m-dohmen/openToolbox/pull/85
[0.16.1]: https://github.com/m-dohmen/openToolbox/releases/tag/v0.16.1
[0.16.0]: https://github.com/m-dohmen/openToolbox/releases/tag/v0.16.0
[#59]: https://github.com/m-dohmen/openToolbox/pull/59
[#60]: https://github.com/m-dohmen/openToolbox/pull/60
[#62]: https://github.com/m-dohmen/openToolbox/pull/62
[0.15.0]: https://github.com/m-dohmen/openToolbox/releases/tag/v0.15.0
[#65]: https://github.com/m-dohmen/openToolbox/pull/65
[#66]: https://github.com/m-dohmen/openToolbox/pull/66
[0.14.0]: https://github.com/m-dohmen/openToolbox/releases/tag/v0.14.0
