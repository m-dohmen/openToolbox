# Contributing

Thanks for looking. This is a hobby project maintained in spare time — expect slow replies and no
support commitment.

## Ground rules for changes

The value of openToolbox is that the output is **one file that runs anywhere without a server**.
Anything that erodes that will not be merged:

- no runtime network dependencies — no CDN links, no web fonts, no external images
- no `localStorage` or `IndexedDB` for the data
- no second HTML entry point
- no weakening of the SVG sanitiser or the validation of AI-proposed changes

## Before opening a pull request

```bash
npm install
npm run build
npm test          # downloads a chromium on first run
```

`npm test` runs twelve suites: pure Node checks on the generated build prompts, the action
validation's reference guard, the crash-safe fixture swap behind the extra builds and the
local-calendar due dates — for the framework and for every example domain under `examples/` — plus
the saved-views machinery, the kanban-board library, the chart math, and the
CHANGELOG-order validator; two end-to-end suites that drive a real headless
browser against the built file over `file://`; and one that opens every built demo. If your
change touches persistence, encryption, the AI client or branding, add an
assertion to `test/smoke.mjs`. A feature without a test tends to break silently three commits later,
because nobody clicks through a single-file app by hand.

`scripts/check-suite-drift.js` runs as a CI step right before `npm test` and holds this
enumeration against `scripts.test` in `package.json` — order is not enforced here, only
completeness.

## Style

- Comments explain **why**, not what. German is fine, English is fine, mixing within one file is not.
- No formatter is enforced. Match the surrounding code.
- Keep the built file small. Every dependency ends up inlined in every file every user receives.

## Reporting a problem

Include the browser and version, whether the file was opened via `file://` or over HTTP, and the
built file size. A 9 KB build means the inlining went wrong and is a different bug from anything
behavioural.
