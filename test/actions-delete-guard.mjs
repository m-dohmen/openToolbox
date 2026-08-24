// SPDX-License-Identifier: Apache-2.0
// Prüft den Referenzschutz im Löschpfad von applyActions (OPEN-70).
//
// AGENTS.md zusichert: "Deleting a record that's still referenced by another
// entity is blocked" - auf jedem Weg, also auch dem der KI. Bisher lebte der
// Schutz nur im Formular und beim Sammel-Löschen; applyActions hat den
// Verweis ignoriert und den Datensatz still entfernt.
//
// Reiner Knoten-Test, kein Browser: die Aktionsprüfung ist Textverarbeitung,
// und genau das macht die Lücke reproduzierbar, ohne die Oberfläche zu brauchen.
import { applyActions } from '../src/lib/actions.js'
import { buildInstructions } from '../src/lib/ai.js'
import { translator } from '../src/i18n.js'
import { ENTITIES } from '../examples/suppliers-certificates.domain.js'

let failed = 0
const check = (name, cond) => {
  if (!cond) {
    console.error(`FEHLER: ${name}`)
    failed++
  }
}

const tr = translator('en')
const records = () => ({
  suppliers: ENTITIES.suppliers.seed(),
  certificates: ENTITIES.certificates.seed(),
})

/* Negativfall (der Repro aus OPEN-70): S-001 trägt zwei Zertifikate - der
   Löschvorschlag darf nicht angewandt werden und muss benannt werden. */
{
  const out = applyActions(records(), [{ op: 'delete', entity: 'suppliers', id: 'S-001' }], ENTITIES, tr, 'suppliers')
  check('Referenzfall wird beanstandet', out.problems.length === 1 && /referenced/.test(out.problems[0]))
  check('Referenzfall nennt das referenzierende Zertifikat', /ISO 27001 certification/.test(out.problems[0]))
  check('Referenzfall löscht nichts', out.done.length === 0)
  check('S-001 bleibt im Bestand', out.next.suppliers.some((r) => r.id === 'S-001'))
  check('Zertifikate bleiben unberührt', out.next.certificates.length === 9)
}

/* Positivfall: ein Zertifikat referenziert niemand - es lässt sich löschen. */
{
  const out = applyActions(records(), [{ op: 'delete', entity: 'certificates', id: 'C-101' }], ENTITIES, tr, 'suppliers')
  check('Unreferenzierter Datensatz wird gelöscht', out.done.length === 1 && /Deleted/.test(out.done[0]))
  check('Positivfall ohne Beanstandung', out.problems.length === 0)
  check('Gelöschter Datensatz ist weg', !out.next.certificates.some((r) => r.id === 'C-101'))
}

/* Reihenfolge in einem Vorschlag: erst die Zertifikate entfernen, dann den
   Lieferanten - der Schutz beurteilt den fortlaufenden Stand, nicht den
   Ausgangsbestand, sonst bliebe dieser legitime Weg blockiert. */
{
  const out = applyActions(
    records(),
    [
      { op: 'delete', entity: 'certificates', id: 'C-101' },
      { op: 'delete', entity: 'certificates', id: 'C-102' },
      { op: 'delete', entity: 'suppliers', id: 'S-001' },
    ],
    ENTITIES,
    tr,
    'suppliers',
  )
  check('Aufgelöster Verweis gibt den Lieferant frei', out.problems.length === 0 && out.done.length === 3)
  check('Lieferant nach seinen Zertifikaten gelöscht', !out.next.suppliers.some((r) => r.id === 'S-001'))
}

/* Die Meldung folgt der Oberflächensprache wie jede andere Beanstandung. */
{
  const out = applyActions(records(), [{ op: 'delete', entity: 'suppliers', id: 'S-001' }], ENTITIES, translator('de'), 'suppliers')
  check('Deutsche Meldung', out.problems.length === 1 && /referenziert/.test(out.problems[0]))
}

/* Das Modell weiß vorab Bescheid: die Anweisungen nennen die Regel. */
{
  const text = buildInstructions(ENTITIES, true)
  check(
    'Anweisungen nennen den Löschschutz',
    /delete is rejected.*references/s.test(text),
  )
  check('Anweisungen ohne Schreibrecht nennen keinen Aktionsteil', !/rejected/.test(buildInstructions(ENTITIES, false)))
}

if (failed) {
  console.error(`${failed} Prüfung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('actions-delete-guard: alle Prüfungen bestanden')
}
