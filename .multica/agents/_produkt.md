## Produktprofil openToolbox (für alle Rollen verbindlich)

**Was es ist:** Eine Vorlage, die zu **einer einzigen, in sich geschlossenen
HTML-Datei** kompiliert. Kein Server, kein Installer, zur Laufzeit nichts aus
dem Netz. Die Datei ist zugleich die Datenbank: Speichern schreibt eine neue
HTML-Datei mit eingebettetem Datenblock.

**Repository:** `https://github.com/m-dohmen/openToolbox` (Branch `main`).
**Live:** https://m-dohmen.github.io/openToolbox/demos/

**Die eine Datei, die ein Werkzeug ausmacht:** `src/domain.js`. Alles Fachliche
steht dort — Schema, Felder, Regeln, Dashboard, Wizard. Der Rest ist generisch.

**`AGENTS.md` ist die maßgebliche Beschreibung** von Schemaform, Feldtypen und
den Regeln, an denen ein Einzeldatei-Build zerbricht. Lies sie, bevor du am
Framework etwas änderst. `CLAUDE.md` ist eine **Kopie** davon; CI schlägt fehl,
wenn beide auseinanderlaufen (`cp AGENTS.md CLAUDE.md`).

### Nicht verhandelbar

Diese fünf Punkte brechen weder Termindruck noch Reviewkompromiss:

1. **Keine Laufzeitabhängigkeit vom Netz.** Kein CDN, keine Webfonts, keine
   externen Bilder. Einzige dokumentierte Ausnahme: der abschaltbare
   Aufrufzähler.
2. **Kein `localStorage`, kein `IndexedDB`** für Daten — unter `file://`
   unzuverlässig. Der eingebettete Datenblock ist der Speicher.
3. **Ein Einstiegspunkt.** `vite-plugin-singlefile` verträgt genau einen.
4. **`removeViteModuleLoader: true` niemals setzen** — leert still das inlinete
   Skript und erzeugt eine 9-KB-Datei, die nichts rendert.
5. **SVG-Reiniger und Aktionsprüfung nicht aufweichen.** Beide existieren, weil
   die Ausgabedatei herumgereicht wird.

### Befehle

| Zweck | Befehl |
|---|---|
| Bauen | `npm run build` → `dist/index.html` |
| Prüfen | `npm test` (vier Suiten: prompts-metrics, smoke, multi-entity, demos) |
| Demos + Prompts neu bauen | `npm run build:demo` |
| Nur Prompts | `npm run prompts` |
| Bilder für README/Wiki | `npm run screenshots` |

### Was die CI erzwingt

- `dist/index.html` ist eine geschlossene Datei ohne externe Verweise
- die eingecheckten Demos unter `docs/demo` und `docs/demos` sind aktuell
- `CLAUDE.md` ist identisch mit `AGENTS.md`
- Plugin-Manifeste und `SKILL.md`-Frontmatter sind gültig
- alle vier Testsuiten laufen durch

### Artefakte, die zusammen gepflegt werden müssen

Eine Änderung am Framework ist erst fertig, wenn **alle** betroffenen Stellen
nachgezogen sind:

- `src/` — der Code
- `test/` — Zusicherungen dazu
- `AGENTS.md` **und** `CLAUDE.md`
- `README.md` und `README.de.md` (ausführlich), dazu die fünf kurzen:
  `README.zh.md`, `README.es.md`, `README.fr.md`, `README.ja.md`, `README.pt.md`
- Wiki (eigenes Git-Repository: `https://github.com/m-dohmen/openToolbox.wiki.git`)
- `examples/` und die daraus gebauten `docs/demos/`
- `plugin/skills/opentoolbox-tool/SKILL.md` — enthält den **Ablauf**, während
  `AGENTS.md` das **Wissen** enthält. Schemadokumentation gehört nicht in den
  Skill; zwei Beschreibungen derselben Sache laufen auseinander.

### Sprache

Issues, Kommentare und Commit-Botschaften auf **Deutsch**, außer der Inhalt
gehört ins Produkt: Code, Codekommentare, englische READMEs, Release-Notes und
`AGENTS.md` bleiben Englisch. Deutschsprachige Demo-Domänen behalten deutsche
Feldbeschriftungen.
