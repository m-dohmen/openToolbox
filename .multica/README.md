<!-- SPDX-License-Identifier: Apache-2.0 -->
# Multica-Setup (nur für die Wartung dieses Repositories)

Dieser Ordner geht **niemanden etwas an, der openToolbox als Vorlage benutzt.**
Er beschreibt, wie die Weiterentwicklung des Repositories selbst in
[Multica](https://multica.ai) organisiert ist: welche Agenten es gibt, was
jeder darf, und wie eine Idee von Michael bis zum Release durchläuft.

## Die Kette

```
Michael  →  Product Manager  →  Tech Lead  →  Entwickler
   (Idee als Issue)   (schneidet, weckt)  │       Demo-Ersteller
                                          │       Doku-Pfleger
                                          └────→  Release-Manager
```

Michael spricht ausschließlich mit dem **Product Manager**. Niemand sonst
kontaktiert ihn. Der PM prüft die Idee gegen die Leitplanken, zerlegt sie in
einzeln lieferbare Issues — ausdrücklich auch in ihre Demo- und Doku-Anteile,
weil ein Feature ohne die sonst regelmäßig undokumentiert bleibt — und weckt
den Tech Lead. Der verteilt, reviewt und ist der Einzige, der `done` setzt.

**Eine Zuweisung weckt niemanden.** Arbeit entsteht nur durch eine Mention im
Format `[@Name](mention://agent/<UUID>)`. Das ist die Stelle, an der solche
Ketten reißen, deshalb steht sie in jeder Rolleninstruktion.

## Dateien

| Datei | Inhalt |
|---|---|
| `setup.sh` | legt Agenten, Squad und Takt an — idempotent |
| `agents/_produkt.md` | Produktprofil, für alle Rollen verbindlich |
| `agents/_multica.md` | Spielregeln in Multica: Mentions, Status, Eskalation, Routing |
| `agents/<rolle>.md` | die Rolle selbst |
| `squad-build.md` | Instruktionen der Squad BUILD |

Jede Agenteninstruktion wird aus **Rolle + Produktprofil + Spielregeln**
zusammengesetzt. Zusammengesetzt statt kopiert: sechs Beschreibungen desselben
Produkts laufen auseinander, und das merkt erst jemand, wenn ein Agent nach
alter Regel handelt.

## Anwenden

```bash
cp .multica/.env.example .multica/.env   # einmalig: Runtime eintragen
./.multica/setup.sh --dry-run            # zeigen, was passieren würde
./.multica/setup.sh                      # anlegen oder aktualisieren
```

### Nichts Umgebungsspezifisches im Repository

In diesen Dateien steht **keine einzige UUID**. Der Workspace wird über seinen
Slug (`opentoolbox`) aufgelöst, die Runtime über ihren Namen aus
`MULTICA_RUNTIME`. `.multica/.env` ist über `.gitignore` ausgeschlossen.

Geheimnisse gibt es hier ohnehin keine — die Anmeldung macht `multica login`,
das Token liegt in der CLI-Konfiguration. Aber Ids und Maschinennamen sind
Topologie: Wer sie in einem öffentlichen Repository stehen lässt, verrät den
Aufbau eines fremden Workspace und lädt jeden, der die Datei kopiert, dazu
ein, versehentlich Agenten dort einzurichten, wo er nichts zu suchen hat.
`setup.sh` bricht deshalb ab, statt auf einen Vorgabewert zurückzufallen,
und zeigt die verfügbaren Runtimes an.

**Die Dateien hier sind die Quelle.** Wer eine Instruktion in der
Multica-Oberfläche ändert, verliert die Änderung beim nächsten Lauf. Ändern,
committen, Skript laufen lassen.

## Takt

Zwei Autopiloten, weil niemand von selbst wach wird, wenn anderswo etwas fertig
wird:

- **Takt BUILD (Pull-Runde)** — alle zwei Stunden. Der Lead zieht offene Arbeit
  an, stößt Liegengebliebenes erneut an, weckt Release oder PM.
- **Takt PM (Stufencheck)** — täglich 6:30. Der PM prüft Stufenpläne, nimmt
  blockierte Issues wieder auf und setzt nach sieben Tagen ohne Antwort seine
  dokumentierte Default-Empfehlung um.

## Bekannte Schwäche

Der Product Manager läuft mit `max_concurrent_tasks = 1`. Im ersten Testlauf
haben zwei parallele Läufe dieselbe Idee zerlegt und zwei identische Issues
angelegt (OPEN-2 und OPEN-3) — beide lasen „noch keine FR vorhanden", bevor der
jeweils andere schrieb. Der Tech Lead hat das Duplikat erkannt und abgeräumt,
aber die Ursache gehört an die Wurzel: Zerlegung lässt sich nicht
parallelisieren. Zusätzlich wiederholt der PM die Duplikatprüfung unmittelbar
vor dem Anlegen.
