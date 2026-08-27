# Changelog

All notable changes to openToolbox are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/).

Release notes for each version live on GitHub:
<https://github.com/m-dohmen/openToolbox/releases>.

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

[0.15.0]: https://github.com/m-dohmen/openToolbox/releases/tag/v0.15.0
[#65]: https://github.com/m-dohmen/openToolbox/pull/65
[#66]: https://github.com/m-dohmen/openToolbox/pull/66
