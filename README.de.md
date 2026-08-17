<img src="docs/social-preview.png" alt="openToolbox" width="100%">

# openToolbox

[English](README.md) · **Deutsch** · [中文](README.zh.md)&nbsp;· [Español](README.es.md)&nbsp;· [Français](README.fr.md)&nbsp;· [日本語](README.ja.md)&nbsp;· [Português](README.pt.md)

**Ein funktionierendes Werkzeug als einzelne HTML-Datei ausliefern. Kein Server, keine Installation,
kein Netz.**

openToolbox ist eine Vorlage für kleine interne Werkzeuge, die unterwegs sein müssen — per Mail,
USB-Stick oder Netzlaufwerk — und auf einem zugenagelten Firmenrechner per Doppelklick laufen
sollen. Die Datei *ist* gleichzeitig die Anwendung und die Datenbank. Speichern schreibt eine neue
HTML-Datei mit den eingebetteten Daten.

Gebaut ist sie für einen Ablauf im Besonderen:

> „Bau mir ein Werkzeug zur Verfolgung von Lieferantenaudits, auf Basis von openToolbox."

Man richtet einen KI-Agenten auf dieses Repository, und er hat alles, was er braucht — das Gerüst,
und [`AGENTS.md`](AGENTS.md), das ihm sagt, was er fragen und welche Datei er ändern soll.

Noch einen Schritt kürzer wird es mit dem Skill in [`plugin/`](plugin/) — einmal installiert,
beschreibt man das gewünschte Werkzeug in einem beliebigen Verzeichnis, und der Agent holt sich die
Vorlage selbst. Claude Code und Codex lesen dieselbe `SKILL.md`:

```bash
claude plugin marketplace add m-dohmen/openToolbox
claude plugin install opentoolbox@opentoolbox
```

Für Codex das Verzeichnis `plugin/skills/opentoolbox-tool` nach `~/.codex/skills/` kopieren — siehe
[`plugin/README.md`](plugin/README.md). Nötig ist der Skill nicht; der Satz oben funktioniert auch
ohne ihn.

---

## Ansehen

[**Sechs Live-Demos**](https://m-dohmen.github.io/openToolbox/demos/) — dasselbe Gerüst als sechs
verschiedene Werkzeuge. Oder eine davon aus [`docs/demos/`](docs/demos/) herunterladen und
doppelklicken. Dieselbe Datei, in beiden Fällen ohne Server.

| Demo | Das Problem dahinter | Datenform |
| --- | --- | --- |
| [Project portfolio](https://m-dohmen.github.io/openToolbox/demos/portfolio/)<br><sub>Aufbau-Prompt: [de](https://m-dohmen.github.io/openToolbox/demos/portfolio/generating_prompt_de.md)&nbsp;· [en](https://m-dohmen.github.io/openToolbox/demos/portfolio/generating_prompt_en.md)&nbsp;· [es](https://m-dohmen.github.io/openToolbox/demos/portfolio/generating_prompt_es.md)&nbsp;· [fr](https://m-dohmen.github.io/openToolbox/demos/portfolio/generating_prompt_fr.md)&nbsp;· [pt](https://m-dohmen.github.io/openToolbox/demos/portfolio/generating_prompt_pt.md)&nbsp;· [zh](https://m-dohmen.github.io/openToolbox/demos/portfolio/generating_prompt_zh.md)&nbsp;· [ja](https://m-dohmen.github.io/openToolbox/demos/portfolio/generating_prompt_ja.md)</sub> | Projekte, Meilensteine, Budgetabweichung | 2 Datenarten, Geld |
| [Verpackungsregister](https://m-dohmen.github.io/openToolbox/demos/ppwr-packaging/)<br><sub>Aufbau-Prompt: [de](https://m-dohmen.github.io/openToolbox/demos/ppwr-packaging/generating_prompt_de.md)&nbsp;· [en](https://m-dohmen.github.io/openToolbox/demos/ppwr-packaging/generating_prompt_en.md)&nbsp;· [es](https://m-dohmen.github.io/openToolbox/demos/ppwr-packaging/generating_prompt_es.md)&nbsp;· [fr](https://m-dohmen.github.io/openToolbox/demos/ppwr-packaging/generating_prompt_fr.md)&nbsp;· [pt](https://m-dohmen.github.io/openToolbox/demos/ppwr-packaging/generating_prompt_pt.md)&nbsp;· [zh](https://m-dohmen.github.io/openToolbox/demos/ppwr-packaging/generating_prompt_zh.md)&nbsp;· [ja](https://m-dohmen.github.io/openToolbox/demos/ppwr-packaging/generating_prompt_ja.md)</sub> | PPWR: die Angaben liegen bei den Lieferanten, nicht bei einem selbst | 2 Datenarten, Anhänge |
| [Verarbeitungsverzeichnis](https://m-dohmen.github.io/openToolbox/demos/gdpr-processing/)<br><sub>Aufbau-Prompt: [de](https://m-dohmen.github.io/openToolbox/demos/gdpr-processing/generating_prompt_de.md)&nbsp;· [en](https://m-dohmen.github.io/openToolbox/demos/gdpr-processing/generating_prompt_en.md)&nbsp;· [es](https://m-dohmen.github.io/openToolbox/demos/gdpr-processing/generating_prompt_es.md)&nbsp;· [fr](https://m-dohmen.github.io/openToolbox/demos/gdpr-processing/generating_prompt_fr.md)&nbsp;· [pt](https://m-dohmen.github.io/openToolbox/demos/gdpr-processing/generating_prompt_pt.md)&nbsp;· [zh](https://m-dohmen.github.io/openToolbox/demos/gdpr-processing/generating_prompt_zh.md)&nbsp;· [ja](https://m-dohmen.github.io/openToolbox/demos/gdpr-processing/generating_prompt_ja.md)</sub> | Art. 30 DSGVO — die Antworten liegen bei zwölf Leuten | Erfassungsmodus, Aufzählungen |
| [Prüfbuch Betriebsmittel](https://m-dohmen.github.io/openToolbox/demos/equipment-testing/)<br><sub>Aufbau-Prompt: [de](https://m-dohmen.github.io/openToolbox/demos/equipment-testing/generating_prompt_de.md)&nbsp;· [en](https://m-dohmen.github.io/openToolbox/demos/equipment-testing/generating_prompt_en.md)&nbsp;· [es](https://m-dohmen.github.io/openToolbox/demos/equipment-testing/generating_prompt_es.md)&nbsp;· [fr](https://m-dohmen.github.io/openToolbox/demos/equipment-testing/generating_prompt_fr.md)&nbsp;· [pt](https://m-dohmen.github.io/openToolbox/demos/equipment-testing/generating_prompt_pt.md)&nbsp;· [zh](https://m-dohmen.github.io/openToolbox/demos/equipment-testing/generating_prompt_zh.md)&nbsp;· [ja](https://m-dohmen.github.io/openToolbox/demos/equipment-testing/generating_prompt_ja.md)</sub> | Wiederkehrende Prüfungen und das Datum, das hinterher keiner findet | Fristen und Intervalle |
| [Sanierung](https://m-dohmen.github.io/openToolbox/demos/renovation-quotes/)<br><sub>Aufbau-Prompt: [de](https://m-dohmen.github.io/openToolbox/demos/renovation-quotes/generating_prompt_de.md)&nbsp;· [en](https://m-dohmen.github.io/openToolbox/demos/renovation-quotes/generating_prompt_en.md)&nbsp;· [es](https://m-dohmen.github.io/openToolbox/demos/renovation-quotes/generating_prompt_es.md)&nbsp;· [fr](https://m-dohmen.github.io/openToolbox/demos/renovation-quotes/generating_prompt_fr.md)&nbsp;· [pt](https://m-dohmen.github.io/openToolbox/demos/renovation-quotes/generating_prompt_pt.md)&nbsp;· [zh](https://m-dohmen.github.io/openToolbox/demos/renovation-quotes/generating_prompt_zh.md)&nbsp;· [ja](https://m-dohmen.github.io/openToolbox/demos/renovation-quotes/generating_prompt_ja.md)</sub> | Drei Angebote je Gewerk, und wo das Budget wirklich steht | 2 Datenarten, Geld |
| [Klassenfahrt](https://m-dohmen.github.io/openToolbox/demos/school-trip/)<br><sub>Aufbau-Prompt: [de](https://m-dohmen.github.io/openToolbox/demos/school-trip/generating_prompt_de.md)&nbsp;· [en](https://m-dohmen.github.io/openToolbox/demos/school-trip/generating_prompt_en.md)&nbsp;· [es](https://m-dohmen.github.io/openToolbox/demos/school-trip/generating_prompt_es.md)&nbsp;· [fr](https://m-dohmen.github.io/openToolbox/demos/school-trip/generating_prompt_fr.md)&nbsp;· [pt](https://m-dohmen.github.io/openToolbox/demos/school-trip/generating_prompt_pt.md)&nbsp;· [zh](https://m-dohmen.github.io/openToolbox/demos/school-trip/generating_prompt_zh.md)&nbsp;· [ja](https://m-dohmen.github.io/openToolbox/demos/school-trip/generating_prompt_ja.md)</sub> | 28 Zettel raus, 19 zurück, und die Liste darf niemand sehen | Zustände statt Zahlen |

**Zu jeder Demo gehört ein Aufbau-Prompt.** `docs/demos/<slug>/generating_prompt_<lang>.md` ist die
vollständige fachliche Anforderung dieses Werkzeugs als Markdown — Felder, Typen, Rechenformeln,
Prüfregeln, Dashboard-Kacheln, Wizard-Schritte, Vorgaben und Startseite. Gibt man ihn zusammen mit
diesem Repository an einen KI-Agenten, kommt genau diese Anwendung zurück. Je sieben Sprachen; die
*Anweisung* ist übersetzt, die Feldbeschriftungen und Regelmeldungen nicht — sie sind das, was das
Werkzeug später tatsächlich anzeigt.

Erzeugt werden sie aus den Domänen selbst (`npm run prompts`), damit ein Prompt nicht von dem
Beispiel abweichen kann, das er beschreibt.

Die Bilder unten stammen aus dem Projektportfolio.

![Die Listenansicht](docs/screenshots/list.png)

Zwei Datensatztypen, die aufeinander verweisen, berechnete Spalten, zählende Filter und die Version
neben dem Titel. Alles Sichtbare entsteht aus einer Datei, `src/domain.js`.

![Das Dashboard](docs/screenshots/dashboard.png)

Das Dashboard berichtet über beide Datensatztypen hinweg. Gezeichnet ohne Diagrammbibliothek — die
Balken sind CSS-Breiten, der Ring ist ein einzelner SVG-Kreis. Beide Ansichten drucken als sauberes
PDF.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/example-prompts.png" alt="Beispiel-Prompts"></td>
<td width="50%"><img src="docs/screenshots/csv-import.png" alt="CSV-Import mit Spaltenzuordnung"></td>
</tr>
<tr>
<td><b>Die Datei erklärt sich selbst.</b> Hinweiskästen tragen einen fertigen Prompt, mit dem sich
genau dieser Teil ändern lässt. Ein Schalter blendet sie aus, bevor die Datei an reine Anwender geht.</td>
<td><b>Echte Daten kommen per CSV hinein</b>, mit Zuordnungsschritt. Trennzeichen und Quoting werden
erkannt; jede Zelle läuft durch dieselbe Typprüfung wie ein KI-Vorschlag.</td>
</tr>
<tr>
<td><img src="docs/screenshots/record.png" alt="Datensatz bearbeiten"></td>
<td><img src="docs/screenshots/dashboard-dark.png" alt="Dunkelmodus"></td>
</tr>
<tr>
<td><b>Das Formular entsteht aus dem Schema</b>, samt Auswahlliste, die eine Referenz auf einen
anderen Datensatztyp auflöst, und schreibgeschützten berechneten Feldern.</td>
<td><b>Hell und dunkel</b>, mit der Datei gespeichert. Die Kategorieabstufungen drehen im
Dunkelmodus die Richtung, damit kein Ende der Reihe verschwindet.</td>
</tr>
<tr>
<td><img src="docs/screenshots/validation.png" alt="Eine Regel verweigert das Speichern"></td>
<td><img src="docs/screenshots/wizard.png" alt="Die geführte Erfassung"></td>
</tr>
<tr>
<td><b>Regeln entscheiden, wann gespeichert werden darf</b> — hier ein Meilenstein in Arbeit ohne
Verantwortlichen. Dieselbe Regel weist die Zeile beim CSV-Import ab und geht als Bedingung an die KI.</td>
<td><b>Die geführte Erfassung</b> führt den Empfänger durch kurze Schritte. In Schritt zwei bietet
das Referenzfeld schon den Entwurf aus Schritt eins an — ein Durchlauf legt beides an.</td>
</tr>
</table>

---

**Eine Datei · Datenbank in der Datei · optionale AES-256-Verschlüsselung · optionaler KI-Assistent ·
brandbar (Farben, Logo, Name) · zweisprachige Oberfläche (Englisch, Deutsch) · hell & dunkel ·
Dashboard · CSV-Import · Änderungsprotokoll · Versionsnummern.**

## Was drin ist

- **Eine Datei.** Rund 90 KB, in sich geschlossen. Doppelklick, sie läuft. Netzwerkkabel ziehen, sie
  läuft weiter — das Einzige, was ihr dann fehlt, ist der [Aufrufzähler](#der-aufrufzähler), und der
  ist einen sichtbaren Schalter vom Aus entfernt.
- **Die Datei ist die Datenbank.** Speichern schreibt eine neue HTML-Datei mit eingebetteten
  Datensätzen. Kein Backend, kein Browserspeicher, keine Synchronisierung.
- **Optionale Verschlüsselung.** AES-256-GCM, Schlüssel über PBKDF2 mit 310.000 Runden abgeleitet.
  Ohne die Passphrase ist die Datei ein Klumpen.
- **Optionaler KI-Assistent.** Auf einen beliebigen OpenAI-kompatiblen Endpunkt richtbar. Er liest
  die Daten, nimmt Dateianhänge als zusätzlichen Kontext und schlägt — auf ausdrückliche Anweisung —
  Änderungen vor, die vor der Anwendung freigegeben werden.
- **Brandbar.** Fünf Farben, Produktname und ein SVG-Logo, alles in der Anwendung änderbar und mit
  der Datei gespeichert. Konfiguration einmal exportieren und für jedes weitere Werkzeug wiederverwenden.
- **Hell- und Dunkelmodus**, Tastenkürzel, CSV- und JSON-Export, bis auf Telefonbreite nutzbar.
- **CSV-Import mit Spaltenzuordnung**, damit echte Daten ohne Abtippen hineinkommen — siehe
  [Daten hineinbekommen](#daten-hineinbekommen).
- **Zwei Oberflächensprachen ab Werk** (Englisch, Deutsch), eine Einstellung, die mit der Datei
  reist. Eine dritte zu ergänzen ist eine kleine, mechanische Änderung — siehe
  [Oberflächensprachen](#oberflächensprachen).
- **Mehrere Entitäten und Beziehungen**, wenn ein Datensatztyp nicht reicht — siehe
  [Mehrere Entitäten](#mehrere-entitäten-und-beziehungen).
- **Dashboard-Kacheln und ein Druck-Stylesheet**, weil Analyse meistens in einer Folie oder einer
  Anlage endet — siehe [Dashboard](#dashboard).
- **Ein Fälligkeiten-Widget im Dashboard**, mit einem Schema-Feld angeschaltet — überfällig, diese
  Woche, nächste 30 Tage, über alle Entitäten hinweg, die es deklarieren — siehe
  [Fälligkeiten](#fälligkeiten).
- **Ein Änderungsprotokoll**, bei jedem Speichern gefüllt mit Datum, Version und dem, was sich
  geändert hat — siehe [Versionen und Änderungsprotokoll](#versionen-und-änderungsprotokoll).
- **Beispiel-Prompts in der Datei**, damit der Empfänger sie ändern lassen kann, ohne diese Datei
  hier gelesen zu haben — siehe [Beispiel-Prompts](#beispiel-prompts).
- **Eine Sperre für die Einstellungsseite**, damit ein Werkzeug in der Hand eines reinen Anwenders
  nicht versehentlich umkonfiguriert wird — siehe
  [Einstellungen sperren](#einstellungen-sperren).
- **Eine änderbare Kopfzeile und bis zu fünf Verweise** in der dunklen Leiste ganz oben, auf das,
  was neben dem Werkzeug liegt — siehe [Die dunkle Leiste oben](#die-dunkle-leiste-oben).
- **Prüfregeln über Felder hinweg**, identisch durchgesetzt im Formular, beim CSV-Import und bei
  Vorschlägen der KI — siehe [Ein eigenes Werkzeug bauen](#ein-eigenes-werkzeug-bauen).
- **Eine bearbeitbare Startseite**, damit die Datei sich erklärt, bevor sie eine Tabelle zeigt —
  siehe [Die Startseite](#die-startseite).
- **Eine geführte Erfassung** und ein Erfassungsmodus, der die Datei direkt darin öffnet — siehe
  [Geführte Erfassung](#geführte-erfassung).
- **Rückläufer zusammenführen**, Datensatz für Datensatz und mit Feldvergleich — siehe
  [Rückläufer zusammenführen](#rückläufer-zusammenführen).
- **Anhänge mit sichtbarem Speicherbudget**, denn ein Werkzeug, das man nicht mehr verschicken kann,
  ist nicht mehr dieses Werkzeug — siehe [Anhänge](#anhänge).

## Schnellstart

```bash
git clone https://github.com/m-dohmen/openToolbox
cd openToolbox
npm install
npm run build     # → dist/index.html
```

`dist/index.html` im Browser öffnen. Das ist alles.

## Ein eigenes Werkzeug bauen

Alles Fachliche steht in **einer Datei**: `src/domain.js`. Austauschen, neu bauen, fertig.

```js
export const SCHEMA = {
  singular: 'risk',
  plural: 'risks',
  titleField: 'name',
  list: ['name', 'owner', 'review', 'likelihood', 'impact'],
  facets: ['likelihood', 'category'],
  fields: [
    { key: 'name', label: 'Risiko', type: 'text', required: true },
    { key: 'category', label: 'Kategorie', type: 'enum', values: ['Betrieb', 'Recht', 'IT'] },
    { key: 'review', label: 'Prüfdatum', type: 'date' },
    { key: 'impact', label: 'Auswirkung', type: 'number' },
  ],
}
```

Ein Feld kann auch **berechnet** statt gespeichert sein:

```js
{ key: 'score', label: 'Risikowert', type: 'computed', compute: (r) => r.likelihood * r.impact }
```

`compute(record)` läuft bei jeder Anzeige, das Ergebnis wird nie in den Datensatz geschrieben — eine
gespeicherte Ableitung ist in dem Moment falsch, in dem sich eine ihrer Quellen ändert, und niemand
merkt es. Sortieren, Suchen, Summieren in der Übersicht und der CSV-Export funktionieren trotzdem
darauf; im Formular ist es schreibgeschützt, und die KI wird darauf hingewiesen und beim Versuch,
es zu setzen, namentlich abgewiesen.

Bedingungen **zwischen** Feldern stehen in `rules`:

```js
rules: [
  { when: (r) => r.status === 'done', require: ['owner'],
    message: 'Ein Punkt in Arbeit braucht einen Verantwortlichen.' },
]
```

Der Wert liegt im einen Aufrufort: **Formular, CSV-Import und die Vorschläge der KI laufen alle
durch dieselbe Prüfung.** Eine Regel im Schema härtet alle drei Wege gleichzeitig. Im Formular
erscheint die Beanstandung unter dem Feld und das Speichern wird verweigert; eine verstoßende
CSV-Zeile wird übersprungen und benannt; das Modell bekommt die Meldung vorab und als Begründung
zurück, wenn es sie übergeht. `required: true` am Feld wird genauso durchgesetzt — und eine
numerische `0` zählt als gefüllt, denn null ist meistens eine echte Angabe.

Dieses Schema allein erzeugt die Tabellenspalten, das Formular, die Filter in der Seitenleiste, den
CSV-Export, die Anweisungen an das KI-Modell und die Prüfung dessen, was das Modell zurückschlägt.

### Anhänge

`type: 'attachment'` legt eine hochgeladene Datei im Datensatz selbst ab; sie reist wie alles andere
mit.

**Das Budget gehört zum Feature.** Anhänge sprengen genau das Versprechen, auf dem diese Bauform
steht — eine Datei, die man per Mail verschickt. Deshalb zeigt ein Balken in der dunklen Leiste
Belegung und Grenze und wird ab 85 % bernsteinfarben, und ein Upload, der die Grenze reißen würde,
wird beim Übernehmen abgelehnt, mit den Zahlen in der Meldung. Voreinstellung 5 MB insgesamt, 4 MB
für eine einzelne Datei, änderbar unter Einstellungen → Daten.

Anhänge erreichen die KI nie — das Modell sieht nur den Dateinamen, denn ein einziges eingebettetes
PDF wäre als base64 größer als das gesamte Kontextfenster. Der CSV-Export trägt den Namen, nicht den
Inhalt. Der abgelegte MIME-Typ wird nie zum Rendern benutzt; heruntergeladen wird immer über einen
Blob mit `download`.

## Mehrere Entitäten und Beziehungen

Die meisten Werkzeuge brauchen nur einen Datensatztyp — dafür genügt der einzelne `SCHEMA`-Export.
Sobald es wirklich zwei oder mehr Arten von Datensätzen gibt, die aufeinander verweisen (Lieferanten
und ihre Zertifikate, Projekte und ihre Meilensteine), exportiert man stattdessen `ENTITIES`: ein
Eintrag je Datensatztyp, plus ein Feld vom Typ `reference` bei dem, der auf den anderen zeigt.

```js
export const ENTITIES = {
  suppliers: { schema: { /* … */ }, uid, emptyRecord, seed, isDone, isOverdue },
  certificates: {
    schema: {
      fields: [
        { key: 'title', label: 'Titel', type: 'text', required: true },
        { key: 'supplierId', label: 'Lieferant', type: 'reference', entity: 'suppliers', required: true },
      ],
    },
    uid, emptyRecord, seed, isDone, isOverdue,
  },
}
```

Ein Reference-Feld erscheint im Formular als Auswahlliste der Zieldatensätze und in der Tabelle als
klickbare Marke mit dem Titel des Ziels — ein Klick wechselt zu jener Entität und öffnet den
Datensatz. Das Löschen eines noch referenzierten Datensatzes wird blockiert, und die Meldung nennt,
was darauf verweist. Der KI-Assistent kennt die Beziehung ebenfalls und darf ein Ziel per Id oder
per Titeltext benennen.

`examples/suppliers-certificates.domain.js` ist ein knappes Beispiel,
`examples/portfolio.domain.js` — die Grundlage der
[Live-Demo](https://m-dohmen.github.io/openToolbox/demo/) — nutzt alles auf einmal.

## Rückläufer zusammenführen

Die strukturelle Schwäche der Datei-als-Datenbank: einmal an fünf Abteilungen verschickt, kommen
fünf Dateien zurück. Bis hierher hieß das abtippen.

**Datei abgleichen** (Seitenleiste, oder Einstellungen → Daten) liest eine zweite Kopie desselben
Werkzeugs und vergleicht sie Datensatz für Datensatz. Drei Gruppen mit Auswahlkästchen: Datensätze
nur in der anderen Datei, Datensätze mit abweichenden Werten — Feld für Feld, vorher und nachher —
und Datensätze, die dort fehlen.

![Rücklauf abgleichen](docs/screenshots/merge.png)

Zu konfigurieren gibt es nichts; gearbeitet wird mit dem Schema und den Identifikatoren. Es ist
damit für zwei Kopien **desselben** Werkzeugs gedacht, nicht für zwei beliebige Dateien. Einen
unbekannten Datensatztyp benennt der Dialog und übergeht ihn, und ein verschlüsseltes Gegenstück
fragt nach seiner eigenen Passphrase.

Eine Vorgabe ist bewusst gesetzt: **Löschungen sind nicht vorausgewählt.** Ein Datensatz, der in der
anderen Kopie fehlt, sieht genauso aus, ob er dort gelöscht wurde oder die Kopie schlicht älter ist
— und nur eine der beiden Lesarten vernichtet Daten. Alles andere ist angehakt, denn die Änderungen
zu übernehmen ist der Grund, aus dem man den Dialog öffnet.

Der Abgleich ändert den Arbeitsstand; gespeichert werden muss die Datei danach noch.

## Daten hineinbekommen

**CSV-Import mit Zuordnungsschritt**, in der Seitenleiste und unter Einstellungen → Daten. Datei
wählen, und der Dialog listet jede gefundene Spalte neben einer Auswahlliste der Felder. Spalten,
deren Überschrift zu einer Feldbeschriftung oder einem Feldschlüssel passt, sind vorbelegt — Groß-
und Kleinschreibung sowie Satzzeichen werden dabei ignoriert. Alles andere ordnet man von Hand zu,
nicht Zugeordnetes bleibt außen vor. Anhängen oder alles ersetzen.

Trennzeichen (`;`, Komma, Tabulator), Quoting und ein führendes BOM werden aus der Datei erkannt, ein
Excel-Export funktioniert also ohne Vorbereitung. Jede Zelle läuft durch dieselbe Typprüfung wie ein
KI-Vorschlag. **Nichts scheitert stillschweigend** — die Ergebnisanzeige benennt jede Beanstandung
mit Zeilennummer, ein schlechter Wert in einer Zelle lässt den Rest der Zeile unberührt, und eine
Zeile ohne Titel wird übersprungen statt halbleer importiert.

Kennungen vergibt immer die Anwendung, nie die Datei — dieselbe Regel wie bei Datensätzen, die die
KI anlegt.

## Die Startseite

Ein Werkzeug, das direkt auf einer Tabelle landet, setzt voraus, dass der Empfänger weiß, was er da
vor sich hat. Meistens weiß er es nicht — er will einen Satz dazu, wofür das gut ist, wer es pflegt
und wo man fragt. Die Anwendung öffnet auf dieser Seite, sobald Text darin steht.

![Die Startseite](docs/screenshots/home.png)

Bearbeitet wird in der Anwendung selbst, in einem kleinen Markdown-Teilsatz: Überschriften, Listen,
Zitate, Trennlinie, `**fett**`, `*kursiv*`, `` `code` `` und `[Verweise](url)`. Alles andere bleibt
einfacher Text — der Inhalt wird zu einer Baumstruktur geparst und als Knoten gerendert, nie als
HTML eingesetzt. Nichts, was dort steht, kann in einer herumgereichten Datei zu Markup werden.

Zwei Dinge dazu. **Der Schutz der Einstellungen deckt diese Seite mit ab** — sind sie geschützt,
wird aus dem Bearbeiten-Knopf ein entsprechender Hinweis, denn sonst wäre der Schutz eine halbe
Sache. Und **der Text liegt bei den Einstellungen**, also außerhalb des verschlüsselten Umschlags
und lesbar, bevor jemand die Datei entsperrt: richtig für „was ist das", falsch für alles
Vertrauliche.

Leerer Text heißt, dass es die Startseite nicht gibt.

## Geführte Erfassung

Liste und Formular setzen voraus, dass man das Werkzeug kennt. Wer die Datei bekommt, um *eine*
Sache zu melden, soll nicht erst eine Tabelle, eine Seitenleiste und siebzehn Felder sortieren
müssen. Ein `WIZARD`-Export gibt ihm stattdessen kurze Schritte — ohne ihn gibt es die Ansicht
schlicht nicht.

```js
export const WIZARD = {
  title: 'Feststellung melden',
  steps: [
    { id: 'was', label: 'Was', fields: ['title', 'area', 'note'] },
    { id: 'wer', label: 'Wer und wann', fields: ['owner', 'due', 'status'] },
    { id: 'bulk', label: 'Mehrere auf einmal', type: 'csv',
      when: (drafts) => Boolean(drafts.records.title) },
    { id: 'pruefen', label: 'Prüfen', type: 'review' },
  ],
  done: { message: 'Danke — das ist erfasst.', allowAnother: true },
}
```

Vier Schritttypen, mehr braucht es generisch nicht: `fields` zeigt eine Teilmenge der Schemafelder,
mit derselben Maschine und denselben Regeln wie das Formular; `csv` ist der vorhandene Import als
Schritt; `review` ist eine aus dem Schema erzeugte Zusammenfassung; der Abschluss kommt aus `done`.
Ein `when` blendet einen Schritt aus, der nicht passt.

Zwei Dinge machen daraus mehr als ein Formular:

- **Der CSV-Schritt zahlt in denselben Durchlauf ein.** Die Zeilen werden vorgemerkt und erst am
  Ende zusammen mit dem Entwurf angelegt — wer mittendrin abbricht, hinterlässt nichts.
- **Die Entwürfe bekommen ihre Id zu Beginn**, deshalb kann ein Referenzfeld in Schritt zwei bei
  mehreren Datensatztypen schon auf den Datensatz aus Schritt eins zeigen — ein Durchlauf legt den
  Lieferanten und sein Zertifikat an.

### Erfassungsmodus

Einstellungen → Anwendung → *Öffnet als* → **Geführte Erfassung** öffnet die Datei direkt im Wizard
und blendet Liste, Entitätsreiter und den „Neu"-Knopf aus. Dieselbe Datei wird damit zum
Erfassungsbogen: Empfänger füllt aus, speichert, schickt zurück. `mode: 'intake'` in
`DEFAULT_SETTINGS` liefert sie gleich so aus.

## Dashboard

Optional, in `src/domain.js` als `DASHBOARD`-Export deklariert. Ohne ihn gibt es die Ansicht nicht.

```js
export const DASHBOARD = {
  tiles: [
    { type: 'stat',  measure: 'count', label: 'Projekte' },
    { type: 'stat',  measure: 'budget', filter: (r) => !isDone(r), label: 'Offenes Budget' },
    { type: 'donut', groupBy: 'phase' },
    { type: 'bar',   groupBy: 'phase', measure: 'budget', label: 'Budget je Phase' },
  ],
}
```

Drei Kacheltypen — `stat` (eine Zahl), `bar` (ein Balken je Aufzählungswert) und `donut` (dieselben
Daten als Ring mit Legende). `measure` ist entweder `'count'` oder ein Feldschlüssel, dessen Werte
summiert werden; `filter(record)` schränkt vorher ein; bei mehreren Entitäten benennt eine Kachel
über `entity`, worauf sie sich bezieht.

Gezeichnet **ohne Diagrammbibliothek**: Die Balken sind CSS-Breiten, der Ring ist ein einzelner
SVG-Kreis mit `stroke-dasharray`. Eine Diagrammbibliothek würde eine Datei, die per Mail durchkommen
muss, um ein Vielfaches aufblähen — für vier Kacheltypen. Die Kategoriefarben leiten sich aus der
Akzentfarbe des Werkzeugs ab, ein umgebrandetes Werkzeug färbt sein Dashboard also selbst um.

### Fälligkeiten

`dueDate` im Schema auf einen Feldschlüssel gesetzt — ein reines `date`-Feld oder ein `computed`-Feld,
genau wie `totalField` ein Zahlenfeld benennt — und oben im Dashboard erscheint ein
Fälligkeiten-Widget:

```js
export const SCHEMA = {
  // …
  dueDate: 'review',
}
```

Anders als die Kacheln oben braucht das keinen `DASHBOARD`-Export: Fälligkeitssteuerung ist der
häufigste Grund, ein solches Werkzeug überhaupt zu öffnen, deshalb erscheint das Widget von selbst,
sobald irgendeine Entität `dueDate` deklariert — mit oder ohne Kacheln. Drei Gruppen, leere werden
verborgen: **Überfällig** (vor heute), **diese Woche** (Montag bis Sonntag der laufenden lokalen
Kalenderwoche) und die **nächsten 30 Tage** danach. Ein per `isDone()` erledigter Datensatz taucht in
keiner Gruppe auf — erledigte Arbeit ist nicht mehr fällig. Verglichen wird auf lokalen
Kalendertagen, nicht auf dem UTC-Zeitpunkt, den `new Date('2026-08-20')` liefern würde — der landet
westlich von Greenwich einen Tag zu früh. Bei mehreren Entitäten aggregiert das Widget über alle, die
`dueDate` deklarieren, und ein Klick auf einen Eintrag springt direkt zum Datensatz. Eine Domäne ohne
`dueDate` sieht ihr bisheriges Dashboard unverändert.

## Versionen und Änderungsprotokoll

Zwei kleine Funktionen, die zählen, sobald eine Datei zu kursieren beginnt.

**Eine Version** ist freier Text unter Einstellungen → Anwendung — `1.4`, `2026-Q3`, `final für
Lenkungsausschuss`. Sie erscheint als Marke neben dem Titel und wandert in den Dateinamen beim
Speichern (`projektportfolio-2.1-2026-08-15.html`), damit man in einem Mailverlauf die richtige
Datei erkennt, ohne sie zu öffnen. Standardmäßig leer, dann ändert sich nichts.

**Das Änderungsprotokoll** schreibt je Speichervorgang einen Eintrag: Zeitstempel, Version und eine
Notiz, die beim Speichern in einem kurzen Dialog abgefragt wird. Die Protokollansicht listet sie
neueste zuerst, die Notizen bleiben nachträglich änderbar.

Die Einträge liegen bei den Datensätzen, nicht bei den Einstellungen — in einer verschlüsselten
Datei steht das Protokoll damit **innerhalb** des Umschlags, wo Notizen wie „Budget nach
Prüfungsfeststellung korrigiert" auch hingehören.

## Beispiel-Prompts

Die gebaute Datei erklärt, wie man sie ändert. An den Stellen, die man typischerweise anpassen will
— Kopfbereich, Tabelle, Filter, Dashboard, Formular, CSV-Import, KI-Bereich — steht ein Kasten in
der Aufmerksamkeitsfarbe, der sagt, was diese Stelle erzeugt, und einen fertigen Prompt für einen
KI-Agenten anbietet, mit Kopierknopf.

Der Sinn: Wer die Datei bekommt, muss weder diese Beschreibung gelesen haben noch wissen, dass es
`src/domain.js` gibt, um das Werkzeug ändern zu lassen. Er kopiert einen Satz und gibt ihn einem
Agenten.

Standardmäßig an, weil die Vorlage lehren soll. **Vor der Übergabe eines fertigen Werkzeugs an reine
Anwender ausschalten** — dort sind die Kästen nur Lärm.

## Warum eine Datei

Drei Randbedingungen, die in regulierten und in Konzernumgebungen immer wieder auftreten:

- Ein kleines Werkzeug zu hosten bedeutet einen Server, eine URL, einen Betriebsverantwortlichen und
  meist eine Sicherheitsprüfung.
- Etwas zu installieren erfordert Administratorrechte, die der Anwender nicht hat.
- Die Daten dürfen den Rechner nicht verlassen.

Eine einzelne HTML-Datei umgeht alle drei. Und sie ist ehrlich in dem, was sie ist: Der Anwender kann
den gesamten Quelltext lesen, und es gibt keinen Dienst, der sich unter ihm still verändern könnte.

## Die dunkle Leiste oben

Zwei Einstellungen prägen sie. **Kopfzeile** ersetzt den Text hinter dem Dateinamen — leer bleibt
der übersetzte Standardtext, der der Oberflächensprache folgt; ausgefüllt gewinnt die eigene Angabe
in jeder Sprache (`Muster GmbH · intern`).

**Verweise in der Kopfzeile** setzt bis zu fünf Symbole rechts neben den Speichern-Knopf, die in
einem neuen Tab öffnen. Vorbelegt ist einer auf dieses Repository; ersetze ihn durch das, was neben
*deinem* Werkzeug liegt — der Confluence-Bereich des Kunden, ein Ticketboard, die Ablage im
Intranet. Jeder Eintrag besteht aus einem SVG-Symbol, einer Adresse und einer Beschriftung, die zum
Kurzhinweis wird.

Symbol und Adresse werden geprüft, denn beides reist mit der Datei zu Leuten, die sie nicht gebaut
haben: Symbole laufen durch denselben Reiniger wie das Logo, und angezeigt werden nur http-, https-
und mailto-Adressen. Ein fehlendes Schema wird zu `https` ergänzt; ein `javascript:` oder `data:`
wird verworfen, statt in einem `href` zu landen.

## Einstellungen sperren

Eine Datei, die an jemanden geht, der nur Daten pflegt, hat trotzdem eine vollständige
Einstellungsseite: Farben, Endpunkte, den Dateinamen, die KI-Konfiguration. Nichts davon muss
angefasst werden, und ein versehentlicher Klick darauf wandert mit jedem folgenden Speichern weiter.

Einstellungen → Sicherheit → *Einstellungen schützen* fragt nach einem Wort und sperrt jedes
Bedienelement auf der Seite. Die Felder bleiben **sichtbar und ihre Werte lesbar** — die Aussage ist
„nicht jetzt", nicht „geht dich nichts an". Dasselbe Wort öffnet sie für die laufende Sitzung
wieder; beim erneuten Öffnen der Datei ist wieder gesperrt, damit der Schutz nicht still
verschwindet, sobald der Ersteller einmal gespeichert hat.

**Das ist ein Schutz vor Versehen, keine Sicherheitsgrenze.** Wer die Datei hat, hat den Code, und
der Sperreintrag lässt sich mit einem Texteditor aus dem Datenblock löschen. Es ist ein Deckel über
einem Schalter. Für alles, was wirklich niemand lesen soll, ist die Verschlüsselung da — die ist
echt.

Das Wort ist auch kein Passwort. Es wird als gesalzener SHA-256-Abdruck abgelegt, damit es nicht im
Klartext in der Datei steht, aber das Eingabefeld zeigt es bewusst offen: für einen Deckel nimmt
niemand ein echtes Passwort, und „123" genügt. Es gibt keine Komplexitätsregel.

## Der Aufrufzähler

Das Einzige in einer gebauten Datei, das von sich aus ins Netz geht. Beim Öffnen sendet sie ein
einzelnes GET an einen Zählendpunkt, mit **der Art des Werkzeugs** — `SCHEMA.singular`, etwa
`action item`. Mehr nicht: keine Datensätze, keine Feldinhalte, kein Dateiname, nichts Eingegebenes.

Drei bewusste Entscheidungen, weil so eine Datei an Leute weitergereicht wird, die sie nicht gebaut
haben:

- **Der Endpunkt ist eine sichtbare, änderbare Einstellung**, vorbelegt mit dem Zähler dessen, der
  die Vorlage gebaut hat. Auf den eigenen umstellen, oder das Feld leeren, dann wird nichts gezählt.
  Die Einstellung reist mit der Datei.
- **Es ist ein beschrifteter Schalter** unter Einstellungen → Sicherheit, mit ausgeschriebenem
  Zielendpunkt daneben. Kein verstecktes Pixel.
- **Der Pfad trägt die Werkzeugart, nie den Dateinamen.** Der ist vom Empfänger änderbar und trägt in
  der Praxis Kundennamen (`kunde-xy-risikoregister`); das an einen Dritten zu senden hieße, etwas
  preiszugeben, das dem Empfänger der Datei gehört.

Zähler aus, KI-Anbindung aus — dann öffnet die Datei **keine** Netzwerkverbindung. Nachprüfbar im
Netzwerk-Tab, und von der Testsuite zugesichert.

## Grenzen, die man kennen sollte

- **Nicht gespeichert heißt verloren.** Es gibt keine automatische Sicherung — ohne Zieldatei kann es
  sie nicht geben. Der gelbe Punkt und die Rückfrage beim Schließen sind das einzige Netz.
  Strg/Cmd+S speichert.
- **Ein Rechner, eine Datei.** Kein Mehrbenutzerbetrieb. Zwei Personen, die dieselbe Datei
  bearbeiten, erzeugen zwei Wahrheiten.
- **Mail-Gateways filtern `.html`-Anhänge** öfter als nicht. Gezippt versenden oder einen
  Dateitransfer nutzen, und den Weg einmal mit einer Attrappe testen, bevor es darauf ankommt.
- **Verschlüsselung schützt die Daten, nicht den Zugriff auf die Anwendung.** Rollen und Ansichten in
  einer lokal laufenden Datei wären nur Oberfläche — wer die Datei hat, hat auch den Code. Die
  [Sperre der Einstellungen](#einstellungen-sperren) ist genau solche Oberfläche und sagt das dort,
  wo sie sitzt.

## Testen

```bash
npm test
```

Fährt zwei Testläufe gegen einen echten Headless-Chromium: den Einzel-Entitäts-Pfad gegen die
gebaute `dist/index.html` und den `ENTITIES`-Pfad gegen einen eigens gebauten Zwei-Entitäten-Build.
Rund 55 Zusicherungen.

## Mitwirken

Fehlermeldungen und Pull Requests sind willkommen, siehe [CONTRIBUTING.md](CONTRIBUTING.md). Das ist
ein Hobbyprojekt — Antworten können dauern, und es gibt keine Supportzusage.

## Lizenz

Apache License 2.0. Quelldateien tragen einen `SPDX-License-Identifier`-Kopf.

Abhängigkeiten: Preact (MIT), Vite (MIT), Playwright nur für Tests (Apache 2.0). Die gebaute Datei
lädt zur Laufzeit nichts nach.

Die Oberfläche gibt es auf Englisch und Deutsch und startet auf Englisch; die ausführliche
Dokumentation im [Wiki](https://github.com/m-dohmen/openToolbox/wiki) ist auf Englisch,
Quelltextkommentare sind auf Deutsch.


<img src="docs/logo.svg" alt="openToolbox Logo" width="96" height="96">
