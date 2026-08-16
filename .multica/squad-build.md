# Squad BUILD — openToolbox

## Zweck

Die Squad setzt die Anforderungen des Product Managers um: Framework
implementieren, Demos bauen, Dokumentation nachziehen, releasen. Anforderungen
kommen fertig geschnitten; **Michael wird nie direkt einbezogen — sein Kanal
ist der Product Manager.**

## Besetzung

| Rolle | Zuständig für |
|---|---|
| Tech Lead (Leader) | Verteilen, Review, Merge, `done`, Release anstoßen |
| Entwickler | `src/`, `test/` |
| Demo-Ersteller | `examples/`, `scripts/demos.mjs`, `docs/demos/` |
| Doku-Pfleger | `AGENTS.md`/`CLAUDE.md`, sieben READMEs, Wiki, Skill |
| Release-Manager | Version, Tag, GitHub-Release, CI |

Alle laufen auf derselben Runtime. Eine Plattformmatrix gibt es hier nicht: die
Anwendung baut und prüft headless, überall gleich.

## Antrieb der Kette

1. **Eine Zuweisung weckt niemanden.** Nur eine Mention im Pflichtformat
   `[@Name](mention://agent/<UUID>)` erzeugt Arbeit. Jedes Weiterreichen endet
   mit einer Mention — Lead → Rolle, Rolle → Lead, Lead → Release. Ohne
   Mention ist die Übergabe nicht passiert.
2. **`backlog` ist ein Lager.** Was laufen soll, steht auf `todo`. Der Lead
   zieht bei jedem Lauf nach.
3. **Fertig heißt weitergereicht.** Wer abschließt, benennt den nächsten
   Schritt und weckt den nächsten Verantwortlichen. Ist eine Stufe fertig,
   meldet der Lead das dem Product Manager — der wird sonst nicht wach.
4. **„Done" heißt „in main".** Gepusht, gemergt, CI grün. Der Lead prüft das
   nachweislich nach.

## Die Reihenfolge, die bei diesem Produkt trägt

**Code zuerst. Demo und Doku parallel, sobald das Verhalten steht. Release
zuletzt.**

Der häufigste Fehler wäre, ein Feature als fertig zu betrachten, wenn es
funktioniert. In diesem Repository ist es erst fertig, wenn auch die Demos neu
gebaut, beide langen READMEs und die fünf kurzen ergänzt und das Wiki
nachgezogen sind. Die CI erzwingt einen Teil davon — sie ist die letzte
Instanz, nicht die erste.

## Was jedes Issue am Ende trägt

Einen Abschlusskommentar: was geändert wurde, wie geprüft, was offen ist. Bei
Code zusätzlich Branch, Commit-SHA und Push-Status.

## Grenzen

- Die fünf nicht verhandelbaren Punkte des Produktprofils brechen weder
  Termindruck noch Reviewkompromiss.
- Anforderungsfragen gehen als Kommentar an den Product Manager, nie an
  Michael.
- Hängt die Squad über 12 Stunden an etwas, das nur Michael liefern kann, legt
  der Lead **ein** Issue `BLOCKER Michael: …` mit Priorität `urgent` an. Vorher
  prüfen, ob es schon existiert — niemand nimmt an, ein anderer habe eskaliert.
