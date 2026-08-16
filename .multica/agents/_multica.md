## Arbeitsumgebung Multica

Die CLI liegt auf dem PATH. Setze den Workspace **ausschließlich** über die
Umgebungsvariable — `multica workspace switch` verstellt den Default für alle
anderen Agenten auf derselben Maschine:

```bash
export MULTICA_WORKSPACE_ID="56cfee6a-3c08-4233-a6be-2d82ffbba9d3"   # openToolbox
multica auth status                                                  # muss den Nutzer zeigen
```

| Zweck | Befehl |
|---|---|
| Offene Arbeit sichten | `multica issue list --status todo` |
| Issue lesen | `multica issue get <KEY>` |
| Issue anlegen | `multica issue create --title "…" --description "…" --status todo --priority <p>` |
| Typ markieren | `multica issue metadata set <KEY> --key type --value feature-request` |
| Herkunft verankern | `multica issue metadata set <KEY> --key source_issue --value <KEY>` |
| Kommentieren | `multica issue comment add <KEY> --content "…"` |
| Status setzen | `multica issue status <KEY> <status>` |
| Agenten-UUIDs auflösen | `multica agent list --output json` |

Status: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`,
`cancelled`.

### Wer wen weckt

| Rolle | Weckt bei … |
|---|---|
| **Product Manager** | fertiger Zerlegung → **Tech Lead** |
| **Tech Lead** | Code-Anteil → **Entwickler** · Demo-Anteil → **Demo-Ersteller** · Doku-Anteil → **Doku-Pfleger** · alles fertig → **Release-Manager** · Stufe fertig → **Product Manager** |
| **Entwickler**, **Demo-Ersteller**, **Doku-Pfleger** | Übergabe oder Eskalation → **Tech Lead** |
| **Release-Manager** | Befund beim Bauen oder rote CI → **Tech Lead** |

Michael wird von niemandem außer dem Product Manager angesprochen, und auch
von ihm nur in den dokumentierten Ausnahmefällen.

Die UUIDs für die Mention löst du zur Laufzeit auf — Namen sind stabil, IDs
nicht:

```bash
multica agent list --output json |
  python3 -c "import json,sys;print({a['name']:a['id'] for a in json.load(sys.stdin)})"
```

### Vier Sätze, die über allem stehen

1. **Eine Zuweisung weckt niemanden.** Arbeit entsteht ausschließlich durch
   eine Mention im Pflichtformat `[@Name](mention://agent/<UUID>)`. Jedes
   Weiterreichen endet mit einer Mention. Ohne Mention ist die Übergabe nicht
   passiert. Plaintext-@ triggert nichts.
2. **`backlog` ist ein Lager, kein Wartezimmer.** Niemand sichtet ihn von
   selbst. Was laufen soll, steht auf `todo`. In den `backlog` kommt nur, was
   auf eine offene Vorbedingung wartet — die Bedingung gehört in die
   Beschreibung („wartet auf <KEY>").
3. **Fertig heißt weitergereicht.** Wer abschließt, benennt den nächsten
   Schritt und weckt den nächsten Verantwortlichen.
4. **„Done" heißt „in main".** Ein Issue wird erst `done`, wenn gepusht und
   nach `main` gemergt ist und die CI grün ist. Code auf einem ungepushten
   Branch ist nicht geliefert. Bei der Übergabe Branch, Commit-SHA und
   Push-Status nennen.

### Fehler statt Blockade

- **Exit 4 / 5** (nicht gefunden, Validierung): fast immer der eigene Fehler.
  Mit `--help`/`--debug` klären, korrigieren, erneut versuchen. Kein Blocker.
- **Exit 2** (Netz): bis zu drei Versuche mit 10 s / 60 s / 180 s Wartezeit.
- **Exit 3** (Auth): einmal `auth status` prüfen; bleibt es dabei, ist das der
  einzige harte Blocker — den Browser-Login kannst du nicht selbst herstellen.
- Erst danach `blocked` **mit** Kommentar: was versucht, welche Exit-Codes, was
  bereits erledigt ist. `blocked` ist ein Wartezustand mit Wiedervorlage, kein
  Endzustand — bei jedem späteren Lauf zuerst die eigenen blockierten Issues
  prüfen und wieder aufnehmen, sobald der Blocker weg ist.
- Hängt es an etwas, das nur Michael liefern kann (Secrets, Hardware,
  Entscheidung), und steht es über 12 Stunden: **ein** Issue
  `BLOCKER Michael: …` mit Priorität `urgent` und nummerierter, konkreter
  Liste. Ein Kommentar in einem Agenten-Issue erreicht ihn nicht. Vorher
  prüfen, ob so ein Issue schon existiert.

### Autonomie

Nichts bleibt liegen, weil eine Antwort aussteht. Bei Unklarheit die kleinste
sinnvolle Interpretation wählen, sie unter „Annahmen" dokumentieren und
weiterarbeiten. Eine dokumentierte falsche Annahme ist billig korrigierbar —
eine hängende Aufgabe nicht.
