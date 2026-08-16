#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
#
# Richtet den Multica-Workspace „openToolbox" ein: Agenten, Squad, Rollen.
#
# Idempotent — ein zweiter Lauf legt nichts doppelt an, sondern aktualisiert
# die Instruktionen der vorhandenen Agenten. Genau so ist es gedacht: die
# Instruktionen liegen als Dateien unter .multica/agents/ im Repository, werden
# dort bearbeitet und mit diesem Skript eingespielt. Wer sie stattdessen in der
# Oberfläche ändert, verliert die Änderung beim nächsten Lauf.
#
#   ./.multica/setup.sh            # anlegen oder aktualisieren
#   ./.multica/setup.sh --dry-run  # nur zeigen, was passieren würde
set -euo pipefail

# Nichts Umgebungsspezifisches steht in dieser Datei. Der Workspace wird ueber
# seinen Slug aufgeloest, die Runtime ueber ihren Namen aus der Umgebung. Beides
# laesst sich in .multica/.env ueberschreiben (nicht eingecheckt, siehe
# .env.example) oder direkt als Umgebungsvariable setzen.
#
# UUIDs gehoeren nicht in ein oeffentliches Repository: sie sind zwar keine
# Credentials und geben ohne Token keinen Zugriff, verraten aber die Topologie
# eines fremden Workspace — und wer die Datei kopiert, richtet sonst versehentlich
# Agenten in einem Workspace ein, der ihm nicht gehoert.

WORKSPACE_SLUG="${MULTICA_WORKSPACE_SLUG:-opentoolbox}"
MODEL="${MULTICA_MODEL:-claude-sonnet-5}"
SQUAD_NAME="BUILD"

DRY=""
[[ "${1:-}" == "--dry-run" ]] && DRY="1"

cd "$(dirname "$0")/.."
AGENTS_DIR=".multica/agents"

# shellcheck source=/dev/null
[[ -f .multica/.env ]] && source .multica/.env

command -v multica >/dev/null || { echo "multica CLI nicht gefunden."; exit 1; }
multica auth status >/dev/null 2>&1 || { echo "Nicht angemeldet: multica login"; exit 1; }

# Workspace ueber den Slug aufloesen.
WORKSPACE_ID="$(multica workspace list --output json |
  python3 -c "
import json,sys
print(next((w['id'] for w in json.load(sys.stdin) if w['slug']==sys.argv[1]), ''))" "$WORKSPACE_SLUG")"
if [[ -z "$WORKSPACE_ID" ]]; then
  echo "Workspace mit Slug '$WORKSPACE_SLUG' nicht gefunden. Vorhanden:"
  multica workspace list --output json | python3 -c "
import json,sys
for w in json.load(sys.stdin): print(f\"  {w['slug']:20} {w['name']}\")"
  echo "Anderen Slug setzen: MULTICA_WORKSPACE_SLUG=<slug> $0"
  exit 1
fi
export MULTICA_WORKSPACE_ID="$WORKSPACE_ID"

# Runtime ueber ihren Namen aufloesen. Bewusst ohne Vorgabewert: welche Maschine
# die Agenten ausfuehrt, ist eine Entscheidung der jeweiligen Umgebung und darf
# nicht aus einer eingecheckten Datei kommen.
if [[ -z "${MULTICA_RUNTIME:-}" ]]; then
  echo "MULTICA_RUNTIME ist nicht gesetzt — Name der Runtime, auf der die Agenten laufen."
  echo "Verfuegbar:"
  multica runtime list --output json | python3 -c "
import json,sys
d=json.load(sys.stdin); d=d if isinstance(d,list) else d.get('runtimes',d)
for r in d:
    if r.get('status')=='online': print(f\"  {r['name']}\")"
  echo
  echo "Setzen, z. B.:  echo 'export MULTICA_RUNTIME=\"…\"' >> .multica/.env"
  exit 1
fi

RUNTIME_ID="$(multica runtime list --output json |
  python3 -c "
import json,sys
d=json.load(sys.stdin); d=d if isinstance(d,list) else d.get('runtimes',d)
print(next((r['id'] for r in d if r['name']==sys.argv[1]), ''))" "$MULTICA_RUNTIME")"
[[ -n "$RUNTIME_ID" ]] || { echo "Runtime '$MULTICA_RUNTIME' nicht gefunden."; exit 1; }

echo "Workspace: $WORKSPACE_SLUG · Runtime: $MULTICA_RUNTIME · Modell: $MODEL"
echo

# Instruktion = gemeinsames Produktprofil + Multica-Spielregeln + Rollentext.
# Zusammengesetzt statt kopiert: sonst laufen sechs Beschreibungen desselben
# Produkts auseinander, und das merkt erst jemand, wenn ein Agent nach alter
# Regel handelt.
instructions_for() {
  cat "$AGENTS_DIR/$1.md"
  printf '\n\n---\n\n'
  cat "$AGENTS_DIR/_produkt.md"
  printf '\n\n---\n\n'
  cat "$AGENTS_DIR/_multica.md"
}

agent_id_by_name() {
  multica agent list --output json |
    python3 -c "import json,sys; print(next((a['id'] for a in json.load(sys.stdin) if a['name']==sys.argv[1]), ''))" "$1"
}

upsert_agent() {
  local file="$1" name="$2" desc="$3" maxtasks="$4"
  local id; id="$(agent_id_by_name "$name")"
  local ins; ins="$(instructions_for "$file")"

  # Menschliche Ausgabe nach stderr: stdout gehoert der Agenten-Id, die der
  # Aufrufer per $( ) einfaengt.
  if [[ -n "$DRY" ]]; then
    local what="anlegen"; [[ -n "$id" ]] && what="aktualisieren"
    printf '  %-26s %-14s %5s Zeichen Instruktion\n' "$name" "$what" "${#ins}" >&2
    return
  fi

  if [[ -n "$id" ]]; then
    multica agent update "$id" \
      --description "$desc" \
      --instructions "$ins" \
      --model "$MODEL" \
      --max-concurrent-tasks "$maxtasks" >/dev/null
    printf '  %-26s aktualisiert (%s)\n' "$name" "${id:0:8}" >&2
  else
    id="$(multica agent create \
      --name "$name" \
      --description "$desc" \
      --instructions "$ins" \
      --model "$MODEL" \
      --runtime-id "$RUNTIME_ID" \
      --max-concurrent-tasks "$maxtasks" \
      --permission-mode public_to --public-to-workspace \
      --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
    printf '  %-26s angelegt (%s)\n' "$name" "${id:0:8}" >&2
  fi
  printf %s "$id"
}

echo "Workspace openToolbox — Agenten:"

# Genau eine Aufgabe gleichzeitig. Zwei parallele Laeufe am selben Issue lesen
# beide "noch keine FR vorhanden" und legen beide an — im ersten Testlauf ist
# genau das passiert (OPEN-2 und OPEN-3, identischer Scope). Zerlegung laesst
# sich ohnehin nicht parallelisieren; queuen ist hier richtig.
PM_ID=$(upsert_agent product-manager "Product Manager" \
  "Nimmt Michaels Ideen als Issue entgegen, schneidet sie in umsetzbare Feature- und Change-Requests und weckt die Squad. Schreibt keinen Code." 1)
LEAD_ID=$(upsert_agent tech-lead "Tech Lead" \
  "Führt die Squad BUILD: verteilt, reviewt, merged, setzt als Einziger done. Implementiert selbst nur Architektur und Eskalationen." 3)
DEV_ID=$(upsert_agent entwickler "Entwickler" \
  "Setzt Framework-Änderungen in src/ und test/ um. Liefert mit Zusicherungen, grünem Build und gepushtem Branch." 3)
DEMO_ID=$(upsert_agent demo-ersteller "Demo-Ersteller" \
  "Baut und pflegt die Schaudemos: examples/, scripts/demos.mjs, docs/demos/ samt generierter Aufbau-Prompts." 2)
DOC_ID=$(upsert_agent doku-pfleger "Doku-Pfleger" \
  "Hält AGENTS.md/CLAUDE.md, sieben READMEs, Wiki und Skill zusammen. Erklärt Entscheidungen, nicht nur Merkmale." 2)
REL_ID=$(upsert_agent release-manager "Release-Manager" \
  "Schließt ab: Version, Tag, GitHub-Release, CI-Beobachtung und ein Blick auf die veröffentlichte Seite." 2)

[[ -n "$DRY" ]] && { echo; echo "Trockenlauf — nichts geändert."; exit 0; }

echo
echo "Squad $SQUAD_NAME:"
SQUAD_ID="$(multica squad list --output json |
  python3 -c "import json,sys; print(next((s['id'] for s in json.load(sys.stdin) if s['name']==sys.argv[1]), ''))" "$SQUAD_NAME")"

SQUAD_DESC="Setzt die Anforderungen des Product Managers um: Framework, Demos, Dokumentation, Release. Michael wird nie direkt einbezogen — sein Kanal ist der Product Manager."
SQUAD_INS="$(cat .multica/squad-build.md)"

if [[ -n "$SQUAD_ID" ]]; then
  multica squad update "$SQUAD_ID" --description "$SQUAD_DESC" --instructions "$SQUAD_INS" >/dev/null
  echo "  aktualisiert (${SQUAD_ID:0:8})"
else
  # `squad create` kennt weder --instructions noch eine Squad ohne Leader:
  # erst mit Leader anlegen, dann die Instruktionen nachtragen.
  SQUAD_ID="$(multica squad create --name "$SQUAD_NAME" --description "$SQUAD_DESC" \
    --leader "$LEAD_ID" --output json |
    python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
  multica squad update "$SQUAD_ID" --instructions "$SQUAD_INS" >/dev/null
  echo "  angelegt (${SQUAD_ID:0:8})"
fi

# Mitglieder. `member add` ist nicht idempotent, deshalb erst den Bestand
# lesen und nur ergänzen, was fehlt.
existing="$(multica squad member list "$SQUAD_ID" --output json |
  python3 -c "
import json,sys
d=json.load(sys.stdin); d=d if isinstance(d,list) else d.get('members',[])
print(' '.join(m['member_id'] for m in d))")"

add_member() {
  local id="$1" role="$2"
  [[ " $existing " == *" $id "* ]] && { printf '  %-26s schon Mitglied\n' "$role"; return; }
  multica squad member add "$SQUAD_ID" --member-id "$id" --type agent --role "$role" >/dev/null
  printf '  %-26s aufgenommen\n' "$role"
}

add_member "$LEAD_ID" leader
add_member "$DEV_ID" "Entwickler"
add_member "$DEMO_ID" "Demo-Ersteller"
add_member "$DOC_ID" "Doku-Pfleger"
add_member "$REL_ID" "Release-Manager"


# ── Takt ────────────────────────────────────────────────────────────────────
#
# Ohne Takt passiert nach dem letzten Weiterreichen nichts mehr: Es gibt keinen
# Mechanismus, der jemanden benachrichtigt, wenn eine Stufe fertig ist. Zwei
# Autopiloten holen das nach — der Lead zieht offene Arbeit an, der PM prüft
# Stufenpläne.

upsert_autopilot() {
  local title="$1" agent_id="$2" cron="$3" desc="$4"
  local id
  id="$(multica autopilot list --output json |
    python3 -c "
import json,sys
d=json.load(sys.stdin); d=d.get('autopilots',d) if isinstance(d,dict) else d
print(next((a['id'] for a in d if a['title']==sys.argv[1]), ''))" "$title")"

  if [[ -n "$id" ]]; then
    multica autopilot update "$id" --description "$desc" >/dev/null
    printf '  %-30s aktualisiert\n' "$title"
  else
    id="$(multica autopilot create --title "$title" --agent "$agent_id" \
      --mode run_only --description "$desc" --output json |
      python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
    multica autopilot trigger-add "$id" --kind schedule --cron "$cron" \
      --timezone Europe/Berlin --label "Takt" >/dev/null
    printf '  %-30s angelegt (%s)\n' "$title" "$cron"
  fi
}

echo
echo "Takt:"

upsert_autopilot "Takt BUILD (Pull-Runde)" "$LEAD_ID" "0 */2 * * *" \
"Pull-Runde als Tech Lead der Squad BUILD — genau ein Durchlauf nach deinen Instructions, Abschnitt 'Pull-Runde':
1. Offene Squad-Arbeit sichten (todo, in_progress, in_review, blocked, backlog im Workspace openToolbox).
2. todo ohne Bearbeiter: zuweisen UND per Mention im Pflichtformat anstossen. Freie Kapazitaet nicht ungenutzt lassen (Entwickler bis 3 Aufgaben, Demo und Doku je 2).
3. backlog-Issues, deren genannte Vorbedingung erfuellt ist: auf todo heben und starten.
4. in_progress ohne Aktivitaet seit ueber 2 Stunden: Bearbeiter erneut per Mention anstossen. in_review, das auf dich wartet: jetzt reviewen.
5. Sind Code, Demo und Doku eines Vorhabens done: Release-Manager per Mention wecken, mit Issue-Liste und SemVer-Empfehlung.
6. Ist eine Stufe vollstaendig done: Product Manager per Mention wecken.
Gibt es nichts zu tun: still beenden, keine Ausgabe, kein Kommentar."

upsert_autopilot "Takt PM (Stufencheck)" "$PM_ID" "30 6 * * *" \
"Stufencheck als Product Manager — genau ein Durchlauf nach deinen Instructions, Abschnitt 'Aufraeumrunde':
1. Alle Vorhaben mit Stufenplan pruefen: Ist eine Stufe vollstaendig done, die Folgestufe von backlog auf todo heben und den Tech Lead per Mention wecken.
2. Eigene blocked-Issues erneut pruefen und wieder aufnehmen, wenn der Blocker weg ist.
3. Eigene in_review-Issues auf neue Kommentare von Michael pruefen und einarbeiten. Liegt ein Issue laenger als 7 Tage ohne Antwort: die dokumentierte Default-Empfehlung umsetzen und abschliessen.
4. Ist ein Vorhaben komplett fertig: am Ausgangs-Issue melden und schliessen.
Laeuft eine Stufe noch: still beenden, kein Nachfragen, kein Kommentarrauschen."

echo
echo "Fertig. Michaels Einstieg: ein Issue anlegen und dem Product Manager zuweisen."
echo "  multica issue create --title 'Idee: …' --description '…' --status todo"
