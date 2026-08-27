# Changelog

All notable changes to openToolbox are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/).

Release notes for each version live on GitHub:
<https://github.com/m-dohmen/openToolbox/releases>.

## [Unreleased]

Nothing yet.

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
[Unreleased]: https://github.com/m-dohmen/openToolbox/compare/v0.15.0...HEAD
[#65]: https://github.com/m-dohmen/openToolbox/pull/65
[#66]: https://github.com/m-dohmen/openToolbox/pull/66
