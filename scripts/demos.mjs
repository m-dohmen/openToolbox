// SPDX-License-Identifier: Apache-2.0
/**
 * Die Schaudemos. Eine Liste, aus der scripts/build-demo.mjs baut und
 * scripts/demo-index.mjs die Übersichtsseite erzeugt.
 *
 * Warum mehrere: ein generisches Werkzeug erklärt sich schlecht. „Datensätze
 * mit Feldern" trifft alles und überzeugt niemanden. Wer dagegen sein eigenes
 * Problem in einer der Demos wiedererkennt — die Verpackungsverordnung, das
 * Prüfbuch, die Klassenfahrt — hat den Übertrag schon gemacht.
 *
 * Deshalb ist die Liste bewusst breit gestreut: verschiedene Datenformen (eine
 * und zwei Datenarten, zahlenlastig, datumslastig, aufzählungslastig),
 * verschiedene Farbräume, verschiedene Zielgruppen vom Handwerksbetrieb bis
 * zur Klassenlehrerin.
 *
 * `slug` ist der Ordner unter docs/demos/. Der Eintrag mit `legacy: true` wird
 * zusätzlich nach docs/demo/ gebaut, weil dorthin bestehende Verweise zeigen.
 */

export const DEMOS = [
  {
    slug: 'portfolio',
    legacy: true,
    example: 'portfolio.domain.js',
    shape: '2 Datenarten · Geld · Referenzen',
    audience: 'Beratung, Projektsteuerung',
    settings: {
      title: 'Project portfolio',
      subtitle: 'Engagements, milestones and where the budget stands',
      fileStem: 'project-portfolio',
      version: '2.1',
    },
    colors: { accent: '#0e7c86', band: '#16202b', flag: '#c2521b', ok: '#2e7d5b', pending: '#d19a0a' },
    blurb:
      'Engagements and their milestones, with budget variance calculated rather than typed. ' +
      'The reference case for two record types that point at each other.',
    home: `# Project portfolio

A worked example built with **openToolbox**: engagements, their milestones, and where the budget
stands. Everything you see comes out of one file, \`src/domain.js\`.

## What to try

- **List** — two record types that reference each other, calculated columns, filters that count
- **Dashboard** — the same data as tiles, drawn without a charting library, plus a due-date widget
  grouping milestones into overdue, this week and the next 30 days, and metric tiles — running
  projects, spend, averages — computed from the data rather than typed
- **Guided entry** — a short wizard that creates an engagement and its first milestone in one run
- **Merge a file** — reconcile a copy that came back from someone else

> This page is editable in the app itself. In a tool you deliver, put here what the recipients
> need: what it is for, who maintains it, and where to ask.`,
  },

  {
    slug: 'ppwr-packaging',
    locale: 'de',
    example: 'ppwr-packaging.domain.js',
    shape: '2 Datenarten · Anhänge · Berechnung über die Grenze',
    audience: 'Kleine Hersteller und Händler in der EU',
    settings: {
      title: 'Verpackungsregister',
      subtitle: 'Konformität nach PPWR, Bestandteil für Bestandteil',
      fileStem: 'verpackungsregister',
      version: '1.0',
    },
    colors: { accent: '#2f6b3a', band: '#17241a', flag: '#b4531c', ok: '#2f6b3a', pending: '#c08a12' },
    blurb:
      'Ab 12.08.2026 braucht jede Verpackung eine Konformitätserklärung. Die Angaben liegen aber ' +
      'bei den Lieferanten — das ist ein Erhebungsproblem, kein Softwareproblem.',
    home: `# Verpackungsregister nach PPWR

Ab dem **12. August 2026** darf in der EU nur noch in Verkehr gebracht werden, was der neuen
Verpackungsverordnung entspricht — mit Konformitätserklärung und technischer Dokumentation
**je Verpackung**.

Für einen Konzern macht das eine Fachabteilung. Für die Manufaktur mit vierzig Artikeln macht das
die Inhaberin — und stellt fest, dass die entscheidenden Angaben gar nicht bei ihr liegen, sondern
bei Kartonlieferant, Etikettendruckerei und Folienhersteller.

## Was diese Demo zeigt

- **Zwei Datenarten**, weil die Recyclingfähigkeit nicht an der Verpackung hängt, sondern an ihren
  Bestandteilen. Ein Sichtfenster aus der falschen Folie kippt die ganze Einheit.
- **Gerechnet statt gepflegt**: Gesamtgewicht, Rezyklatanteil und die schlechteste Klasse ergeben
  sich aus den Bestandteilen.
- **Regeln, die Schätzungen sichtbar machen** — eine Zahl ohne Quelle lässt sich nicht speichern.
- **Anhänge** für die Erklärung selbst, mit hartem Speicherbudget.

> Erfundene Daten, Veranschaulichung der Struktur. Keine Rechtsberatung und kein Nachweis von
> Konformität.`,
  },

  {
    slug: 'gdpr-processing',
    locale: 'de',
    example: 'gdpr-processing.domain.js',
    shape: '1 Datenart · fast nur Aufzählungen · Erfassungsmodus',
    audience: 'Jedes Unternehmen mit Beschäftigten',
    settings: {
      title: 'Verarbeitungsverzeichnis',
      subtitle: 'Art. 30 DSGVO — gemeldet von den Fachbereichen',
      fileStem: 'verarbeitungsverzeichnis',
      version: '1.0',
      mode: 'intake',
    },
    colors: { accent: '#3a5a8c', band: '#1b2333', flag: '#b0472e', ok: '#3a7a5e', pending: '#c08a12' },
    blurb:
      'Die Pflicht kennt jeder, das Verzeichnis führt fast niemand. Der Grund ist die Erhebung: ' +
      'die Angaben liegen bei zwölf Leuten. Diese Demo öffnet deshalb direkt im Meldeformular.',
    home: `# Verzeichnis von Verarbeitungstätigkeiten

Nach **Art. 30 DSGVO** muss fast jedes Unternehmen eines führen. Fast keines führt eines, das den
Namen verdient — und der Grund ist selten Unwille.

Es ist die Erhebung. Die Angaben liegen bei zwölf verschiedenen Leuten: die Bewerbungsmappen bei
der Personalstelle, das Newsletter-Werkzeug im Marketing, die Videoanlage beim Hausmeister. Wer das
zentral ausfüllen will, schreibt zwölf Mails und bekommt neun Antworten.

## Was diese Demo zeigt

Diese Datei ist im **Erfassungsmodus** ausgeliefert: sie öffnet direkt im Meldeformular und zeigt
die Liste gar nicht. Gedacht ist sie zum Weiterschicken — jeder Fachbereich meldet seine eigene
Verarbeitung, speichert und schickt zurück. Die Rückläufer führt man mit *Datei abgleichen*
zusammen.

Umschalten auf das vollständige Werkzeug: **Einstellungen → Anwendung → Öffnet als**.

> Erfundene Einträge, Veranschaulichung der Struktur. Keine Rechtsberatung.`,
  },

  {
    slug: 'equipment-testing',
    locale: 'de',
    example: 'equipment-testing.domain.js',
    shape: '1 Datenart · Fristen und Intervalle · Anhänge',
    audience: 'Handwerk, Werkstatt, Einrichtungen',
    settings: {
      title: 'Prüfbuch Betriebsmittel',
      subtitle: 'Wiederkehrende Prüfungen nach DGUV Vorschrift 3',
      fileStem: 'pruefbuch',
      version: '1.0',
    },
    colors: { accent: '#a8541f', band: '#2a1d14', flag: '#b3341f', ok: '#3f7a3f', pending: '#c99411' },
    blurb:
      'Die Prüfung dauert Minuten, die Verwaltung den Nachmittag. Nach einem Unfall lautet die ' +
      'Frage: wann wurde genau dieses Gerät zuletzt geprüft?',
    home: `# Prüfbuch für ortsveränderliche Betriebsmittel

Bohrmaschine, Verlängerung, Kaffeemaschine, Heißluftgebläse: alles muss regelmäßig geprüft werden.
Die Prüfung selbst dauert Minuten. Die Verwaltung frisst den Nachmittag — weil das Protokoll im
Ordner liegt, die Fristen im Kopf des Meisters, und die Berufsgenossenschaft nach einem Unfall
genau eine Frage stellt: **wann wurde dieses Gerät zuletzt geprüft?**

## Was diese Demo zeigt

- **Nichts wird summiert, alles gerechnet**: die Fälligkeit ergibt sich aus letzter Prüfung und
  Intervall, die Restzeit daraus, die rote Markierung wieder daraus.
- **Regeln, die dem Ernstfall standhalten** — ein Ergebnis ohne Datum und Prüfer lässt sich nicht
  speichern, ein „nicht bestanden" nicht ohne die Angabe, wo das Gerät jetzt ist.
- **Anhänge** für das Prüfprotokoll am Gerät selbst.

> Erfundene Daten. Veranschaulichung der Struktur, keine Aussage über den Umfang Ihrer Pflichten.`,
  },

  {
    slug: 'renovation-quotes',
    locale: 'de',
    example: 'renovation-quotes.domain.js',
    shape: '2 Datenarten · Geld · Bindefristen',
    audience: 'Bauherren, Hausverwaltung',
    settings: {
      title: 'Sanierung',
      subtitle: 'Gewerke, Angebote und wo das Budget steht',
      fileStem: 'sanierung',
      version: '1.0',
    },
    colors: { accent: '#6b4a8c', band: '#241b2e', flag: '#b4442e', ok: '#3f7a5c', pending: '#c08a12' },
    blurb:
      'Drei Angebote je Gewerk, eines kommt nie, und nach drei Monaten weiß niemand mehr, warum ' +
      'man sich für den mittleren entschieden hat.',
    home: `# Sanierung: Gewerke und Angebote

Für jedes Gewerk holt man drei Angebote ein. Eines kommt nie, eines ist doppelt so teuer wie
gedacht, und drei Monate später weiß niemand mehr, warum die Wahl auf den mittleren fiel. Am Ende
steht die Frage, die jeder Bauherr zu spät stellt: **sind wir noch im Budget?**

## Was diese Demo zeigt

- **Zwei Datenarten**: ein Angebot ohne sein Gewerk hat keine Aussage, ein Gewerk bekommt seine
  Zahl erst durch die Angebote.
- **Die Auftragssumme wird nicht getippt**, sie steht im beauftragten Angebot und wird von dort
  geholt. Abweichung zum Budget ebenso.
- **Ablaufende Bindefristen werden rot** — der teuerste übersehene Termin am Bau.
- **Regeln gegen das Vergessen**: ein abgelehntes Angebot verlangt eine Begründung.

> Erfundene Zahlen und Firmen.`,
  },

  {
    slug: 'school-trip',
    locale: 'de',
    example: 'school-trip.domain.js',
    shape: '1 Datenart · Zustände statt Zahlen · verschlüsselt gedacht',
    audience: 'Schule, Verein, Ehrenamt',
    settings: {
      title: 'Klassenfahrt',
      subtitle: 'Rückläufer, Zahlungen und wer noch fehlt',
      fileStem: 'klassenfahrt',
      version: '1.0',
    },
    colors: { accent: '#a33a63', band: '#2b1823', flag: '#b4442e', ok: '#3f7a5c', pending: '#c08a12' },
    blurb:
      '28 Zettel raus, 19 zurück, drei ohne Unterschrift. Und die Tabelle darf niemand sehen, ' +
      'weil Allergien darin stehen.',
    home: `# Klassenfahrt

28 Zettel gehen raus, 19 kommen zurück, drei ohne Unterschrift, einer mit einer Allergie auf der
Rückseite. Zwei Tage vor Abfahrt fehlt das Geld von vier Familien.

## Was diese Demo zeigt

- **Ein Bestand fast ohne Zahlen**: Zustände, Ja/Nein, ein offener Restbetrag, der sich selbst
  ausrechnet.
- **Regeln, die dem Alltag folgen** — wo Medizinisches steht, muss eine Telefonnummer daneben
  stehen.
- **Der Grund, warum diese Datei verschlüsselt gehört**: hier stehen Gesundheitsangaben von
  Kindern. Einstellungen → Sicherheit → *Verschlüsseln*. Ohne Passphrase ist die Datei danach ein
  Klumpen — auch für Sie.

> Erfundene Namen und Angaben.`,
  },
]
