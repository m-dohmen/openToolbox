# Changelog

All notable changes to openToolbox are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/).

Release notes for each version live on GitHub:
<https://github.com/m-dohmen/openToolbox/releases>.

## [Unreleased]

Nothing yet.

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

[0.16.1]: https://github.com/m-dohmen/openToolbox/releases/tag/v0.16.1

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

[0.16.0]: https://github.com/m-dohmen/openToolbox/releases/tag/v0.16.0
[#59]: https://github.com/m-dohmen/openToolbox/pull/59
[#60]: https://github.com/m-dohmen/openToolbox/pull/60
[#62]: https://github.com/m-dohmen/openToolbox/pull/62

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

[0.15.0]: https://github.com/m-dohmen/openToolbox/releases/tag/v0.15.0
[0.14.0]: https://github.com/m-dohmen/openToolbox/releases/tag/v0.14.0
[Unreleased]: https://github.com/m-dohmen/openToolbox/compare/v0.16.1...HEAD
[#65]: https://github.com/m-dohmen/openToolbox/pull/65
[#66]: https://github.com/m-dohmen/openToolbox/pull/66
