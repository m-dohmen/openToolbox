// SPDX-License-Identifier: Apache-2.0
/**
 * Textbausteine für die generierten Aufbau-Prompts, je Sprache.
 *
 * Übersetzt wird ausschließlich die **Anweisung an den Agenten**. Die
 * fachlichen Inhalte — Feldbeschriftungen, Aufzählungswerte, Regeltexte —
 * bleiben in der Sprache, in der das Werkzeug später erscheinen soll. Ein
 * spanischer Prompt, der ein deutsches Prüfbuch bauen lässt, muss die deutschen
 * Beschriftungen unverändert durchreichen; sonst baut der Agent ein anderes
 * Werkzeug als das gezeigte.
 *
 * `%s` steht für eingesetzte Werte, in der Reihenfolge der Argumente.
 */

const L = {
  en: {
    code: 'en',
    name: 'English',
    intro: 'Build me this tool',
    lead:
      'Everything below is the functional specification. Follow it as written; where it is silent, ' +
      'use your judgement and say what you assumed.',
    startHere: 'Start here',
    startBody:
      'Use the **openToolbox** template: %s. Read `AGENTS.md` in that repository first — it is the ' +
      'authority on the schema shape, the field types and the rules that break a single-file build. ' +
      'Everything domain-specific goes into one file, `src/domain.js`.',
    startSkill:
      'If you have the openToolbox skill installed (`claude plugin install opentoolbox@opentoolbox`), ' +
      'just paste this file — it fetches the template itself.',
    problem: 'The problem this solves',
    result: 'What it has to be at the end',
    resultBody:
      'One self-contained HTML file, opened by double-click, no server and no installation. The file ' +
      'is also the database: saving writes a new HTML file with the records embedded in it.',
    records: 'Record types',
    recordsOne: 'The record',
    entityIntro: 'Entity key `%s` — one record is a **%s**, several are **%s**.',
    singleIntro: 'One record is a **%s**, several are **%s**.',
    fields: 'Fields',
    thKey: 'Key',
    thLabel: 'Label',
    thType: 'Type',
    thDetail: 'Detail',
    required: 'required',
    longText: 'multi-line',
    oneOf: 'one of: %s',
    refTo: 'reference to `%s`',
    computedFrom: 'calculated, never stored',
    attachmentNote: 'uploaded file, stored in the record',
    shortHead: 'table header `%s`',
    presentation: 'Presentation',
    titleField: 'Headline column: `%s`',
    subFieldRow: 'Second line under the headline: `%s`',
    listRow: 'Table columns, in this order: %s',
    facetsRow: 'Sidebar filters: %s',
    searchRow: 'Searched by the search box: %s',
    totalRow: 'Summed in the overview: `%s`',
    overdueRow: 'Flagged red when: %s',
    doneRow: 'No longer counts as open when: %s',
    computed: 'Calculated fields',
    computedIntro:
      'These are derived on every render and never written into the record — a stored derivation ' +
      'goes stale the moment one of its inputs changes.',
    rules: 'Validation rules',
    rulesIntro:
      'Conditions between fields. They must be enforced in one place so that the edit form, the CSV ' +
      'import and anything the AI proposes all pass through the same check.',
    savedViews: 'Saved views',
    savedViewsIntro:
      'Named combinations of query, field filters and sort, offered by the dropdown at the list ' +
      'head. What is declared here is what the tool ships with — recipients save their own ' +
      'additions under `settings.views`. Merge: same name = last edit wins.',
    savedViewsFields:
      '`name` (unique), `query` (same as the search box), `filters` (`{ field: spec }`, where a ' +
      'spec with just `v` sets the matching facet and a spec with `op` sets a field filter), and ' +
      '`sort` (`{ key, dir }`, `dir` is `1` or `-1`). `entity` is optional and reserved for multi-entity.',
    savedViewPreset: 'preset: **%s**',
    board: 'Board',
    boardIntro:
      'An optional Kanban per entity, opened from the tab strip next to *List* and *Dashboard*. ' +
      'Without this declaration the view does not exist, the same posture as Dashboard and the ' +
      'guided entry wizard — declaring it is what enables it.',
    boardFields:
      '`columnField` (the key of an existing enum field — its `values` define the columns in that ' +
      'order, so the first value sits at the left), `cardFields` (up to three further field keys ' +
      'shown on each card below the title; omit to take the first three non-title, non-column, ' +
      'non-computed, non-attachment fields), and `limit` (per-column card cap, default `50`). ' +
      'Dragging a card to another column writes through the same `mutate` path as the edit form, ' +
      'so the move lands in the undo stack and the change log. Read-only copies render the board ' +
      'with dragging disabled.',
    boardColumn: 'columns come from the enum `values`, in declared order',
    boardUnassigned: 'records whose value is empty or no longer in `values` land in a small *Unassigned* reservoir at the right',
    ruleWhen: 'When',
    ruleThen: 'Then',
    ruleMessage: 'Message',
    ruleAlways: 'always',
    dashboard: 'Dashboard',
    dashboardIntro: 'Tiles over the whole record set, not the filtered view.',
    tileStat: 'A single number: %s',
    tileBar: 'Bars per value of `%s`, measuring %s',
    tileDonut: 'A ring per value of `%s`',
    tileFiltered: ' (only records matching a filter)',
    measureCount: 'the record count',
    metrics: 'Metric tiles',
    metricsIntro:
      'Declared on this entity from a closed catalog — count, sum and average over numeric fields. ' +
      'Computed at render time, never stored.',
    metricCount: 'the number of records',
    metricSum: 'the sum of %s',
    metricAvg: 'the average of %s',
    metricsNote:
      'The framework formats averages with two decimals in the interface language’s decimal ' +
      'notation, rejects invalid declarations by name when the file loads instead of hiding them, ' +
      'and a tile click jumps to that entity’s list — unfiltered in this version.',
    wizard: 'Guided entry',
    wizardIntro:
      'A short sequence of steps for someone who has to report one thing and does not know the tool. ' +
      'Nothing is written until the last step is confirmed — abandoning it must leave nothing behind.',
    wizardTitle: 'Title: **%s**',
    wizardStep: 'Step',
    wizardFields: 'fields: %s',
    wizardCsv: 'CSV upload, feeding the same run',
    wizardReview: 'summary generated from the schema',
    wizardWhen: 'shown only when: %s',
    wizardDone: 'Closing screen: “%s”',
    settings: 'Defaults',
    settingsIntro: 'Set these in `DEFAULT_SETTINGS`, `DEFAULT_COLORS` and `DEFAULT_HOME` in `src/app.jsx`.',
    setTitle: 'Title',
    setSubtitle: 'Subtitle',
    setFile: 'File name',
    setVersion: 'Version',
    setLocale: 'Interface language',
    setMode: 'Opens as',
    setModeIntake: 'guided entry (the list is hidden)',
    setModeWorkbench: 'the full tool',
    setColors: 'Colours',
    startPage: 'Start page',
    startPageIntro:
      'The app opens on this text. It is a small Markdown subset — headings, lists, quotes, bold, ' +
      'italic, inline code and links. Use it verbatim:',
    seedHead: 'Demo data',
    seedBody:
      'Add %s realistic demo records so the file is not empty on first open. Invent them in the ' +
      'style of the examples above; they are illustration, not the user’s data. Tell the user their ' +
      'own data goes in through **Import CSV → replace all**.',
    done: 'Done when',
    doneItems: [
      '`npm run build` produces one self-contained `dist/index.html`',
      '`npm test` passes',
      'the file opens by double-click and shows the demo records',
      'the calculated fields show values, and the rules refuse a record that violates them',
      'the settings, colours and start page match the specification above',
    ],
    handover: 'Before handing it over',
    handoverBody:
      'Decide these rather than leaving them to the recipient: set `copyright` to whoever owns the ' +
      'tool, replace the header link that points at the openToolbox repository, and switch ' +
      '`examplePrompts` off if the recipient only enters data. Mention the usage counter ' +
      '(Settings → Security) at handover rather than letting someone find it in a network log.',
    footer:
      'Generated from `examples/%s` — the working source of the [live demo](%s). Regenerate with ' +
      '`npm run prompts`.',
    disclaimer:
      'All data in the demo is invented. It illustrates the structure of such a tool — it is not ' +
      'legal advice and not proof of anyone’s compliance.',
  },

  de: {
    code: 'de',
    name: 'Deutsch',
    intro: 'Bau mir dieses Werkzeug',
    lead:
      'Alles Folgende ist die fachliche Anforderung. Halte dich daran; wo sie schweigt, entscheide ' +
      'selbst und sage, was du angenommen hast.',
    startHere: 'Ausgangspunkt',
    startBody:
      'Nutze die Vorlage **openToolbox**: %s. Lies dort zuerst `AGENTS.md` — sie ist maßgeblich für ' +
      'Schemaform, Feldtypen und die Regeln, an denen ein Einzeldatei-Build zerbricht. Alles ' +
      'Fachliche kommt in eine einzige Datei, `src/domain.js`.',
    startSkill:
      'Ist der openToolbox-Skill installiert (`claude plugin install opentoolbox@opentoolbox`), ' +
      'genügt es, diese Datei einzufügen — er holt sich die Vorlage selbst.',
    problem: 'Das Problem dahinter',
    result: 'Was am Ende dastehen muss',
    resultBody:
      'Eine einzelne, in sich geschlossene HTML-Datei, per Doppelklick zu öffnen, ohne Server und ' +
      'ohne Installation. Die Datei ist zugleich die Datenbank: Speichern schreibt eine neue ' +
      'HTML-Datei mit den eingebetteten Datensätzen.',
    records: 'Datenarten',
    recordsOne: 'Der Datensatz',
    entityIntro: 'Entitätsschlüssel `%s` — ein Datensatz ist **%s**, mehrere sind **%s**.',
    singleIntro: 'Ein Datensatz ist **%s**, mehrere sind **%s**.',
    fields: 'Felder',
    thKey: 'Schlüssel',
    thLabel: 'Beschriftung',
    thType: 'Typ',
    thDetail: 'Näheres',
    required: 'Pflicht',
    longText: 'mehrzeilig',
    oneOf: 'einer von: %s',
    refTo: 'Referenz auf `%s`',
    computedFrom: 'berechnet, nie gespeichert',
    attachmentNote: 'hochgeladene Datei, im Datensatz abgelegt',
    shortHead: 'Tabellenkopf `%s`',
    presentation: 'Darstellung',
    titleField: 'Führende Spalte: `%s`',
    subFieldRow: 'Zweite Zeile darunter: `%s`',
    listRow: 'Tabellenspalten, in dieser Reihenfolge: %s',
    facetsRow: 'Filter in der Seitenleiste: %s',
    searchRow: 'Vom Suchfeld durchsucht: %s',
    totalRow: 'In der Übersicht summiert: `%s`',
    overdueRow: 'Rot markiert, wenn: %s',
    doneRow: 'Zählt nicht mehr als offen, wenn: %s',
    computed: 'Berechnete Felder',
    computedIntro:
      'Sie werden bei jeder Anzeige gerechnet und nie in den Datensatz geschrieben — eine ' +
      'gespeicherte Ableitung ist in dem Moment falsch, in dem sich eine ihrer Quellen ändert.',
    rules: 'Prüfregeln',
    rulesIntro:
      'Bedingungen zwischen Feldern. Sie müssen an einer Stelle greifen, damit Formular, CSV-Import ' +
      'und die Vorschläge der KI durch dieselbe Prüfung laufen.',
    savedViews: 'Gespeicherte Ansichten',
    savedViewsIntro:
      'Benannte Kombinationen aus Suchbegriff, Feldfiltern und Sortierung, die das Dropdown am ' +
      'Listenkopf anbietet. Was hier steht, liefert das Werkzeug mit; eigene Sichten legen die ' +
      'Empfänger unter `settings.views` an. Merge: gleicher Name = letzter Stand gewinnt.',
    savedViewsFields:
      '`name` (eindeutig), `query` (wie das Suchfeld), `filters` (`{ field: spec }`, wobei `spec` ' +
      'mit nur `v` die gleichnamige Facette setzt, mit `op` einen Feldfilter) und `sort` ' +
      '(`{ key, dir }`, `dir` ist `1` oder `-1`). `entity` ist optional und der Multi-Entität ' +
      'vorbehalten.',
    savedViewPreset: 'Vorschlag: **%s**',
    board: 'Board',
    boardIntro:
      'Eine optionale Kanban-Sicht pro Entität, erreichbar aus der Reiterleiste neben *Liste* und ' +
      '*Dashboard*. Ohne diese Deklaration gibt es die Ansicht gar nicht — gleiche Haltung wie beim ' +
      'Dashboard und beim Wizard: erst die Erklärung im Schema schaltet sie frei.',
    boardFields:
      '`columnField` (Schlüssel eines vorhandenen enum-Feldes — seine `values` bestimmen die ' +
      'Spalten in dieser Reihenfolge, der erste Wert steht links), `cardFields` (bis zu drei ' +
      'weitere Feldschlüssel, die auf jeder Karte unter dem Titel erscheinen; weglassen = die ' +
      'ersten drei Nicht-Titel-, Nicht-Spalten-, Nicht-Computed-, Nicht-Attachment-Felder), und ' +
      '`limit` (Kartenobergrenze pro Spalte, Standard `50`). Eine Karte per Drag in eine andere ' +
      'Spalte läuft über denselben `mutate`-Pfad wie das Formular — die Verschiebung landet in ' +
      'der Undo-Historie und im Änderungsprotokoll. Schreibgeschützte Kopien zeigen das Board ' +
      'ohne Ziehfunktion.',
    boardColumn: 'Spalten folgen den enum-`values` in deklarierter Reihenfolge',
    boardUnassigned: 'Datensätze mit leerem oder nicht mehr gültigem Wert landen rechts in einem kleinen Reservoir „Nicht zugeordnet"',
    ruleWhen: 'Wenn',
    ruleThen: 'Dann',
    ruleMessage: 'Meldung',
    ruleAlways: 'immer',
    dashboard: 'Dashboard',
    dashboardIntro: 'Kacheln über den gesamten Bestand, nicht über die gefilterte Ansicht.',
    tileStat: 'Eine Zahl: %s',
    tileBar: 'Balken je Ausprägung von `%s`, gemessen an %s',
    tileDonut: 'Ein Ring je Ausprägung von `%s`',
    tileFiltered: ' (nur Datensätze, die einem Filter entsprechen)',
    measureCount: 'der Anzahl',
    metrics: 'Kennzahl-Kacheln',
    metricsIntro:
      'An dieser Entität aus einem geschlossenen Katalog deklariert — count, Summe und Mittelwert ' +
      'über Zahlenfelder. Gerechnet beim Rendern, nie gespeichert.',
    metricCount: 'die Anzahl der Datensätze',
    metricSum: 'die Summe von %s',
    metricAvg: 'der Mittelwert von %s',
    metricsNote:
      'Das Framework formatiert Mittelwerte mit zwei Nachkommastellen im Dezimalzeichen der ' +
      'Oberflächensprache, weist ungültige Deklarationen beim Laden benannt zurück, statt sie still ' +
      'zu verbergen, und ein Klick auf eine Kachel springt ungefiltert zur Liste dieser Entität.',
    wizard: 'Geführte Erfassung',
    wizardIntro:
      'Eine kurze Schrittfolge für jemanden, der eine Sache melden soll und das Werkzeug nicht ' +
      'kennt. Geschrieben wird nichts, bevor der letzte Schritt bestätigt ist — ein Abbruch darf ' +
      'nichts hinterlassen.',
    wizardTitle: 'Titel: **%s**',
    wizardStep: 'Schritt',
    wizardFields: 'Felder: %s',
    wizardCsv: 'CSV-Upload, zahlt in denselben Durchlauf ein',
    wizardReview: 'Zusammenfassung, aus dem Schema erzeugt',
    wizardWhen: 'nur wenn: %s',
    wizardDone: 'Abschluss: „%s“',
    settings: 'Vorgaben',
    settingsIntro:
      'In `DEFAULT_SETTINGS`, `DEFAULT_COLORS` und `DEFAULT_HOME` in `src/app.jsx` setzen.',
    setTitle: 'Titel',
    setSubtitle: 'Untertitel',
    setFile: 'Dateiname',
    setVersion: 'Version',
    setLocale: 'Oberflächensprache',
    setMode: 'Öffnet als',
    setModeIntake: 'geführte Erfassung (die Liste bleibt verborgen)',
    setModeWorkbench: 'vollständiges Werkzeug',
    setColors: 'Farben',
    startPage: 'Startseite',
    startPageIntro:
      'Die Anwendung öffnet auf diesem Text. Er ist ein kleiner Markdown-Teilsatz — Überschriften, ' +
      'Listen, Zitate, fett, kursiv, Inline-Code und Verweise. Wörtlich übernehmen:',
    seedHead: 'Beispieldaten',
    seedBody:
      'Lege %s realistische Beispieldatensätze an, damit die Datei beim ersten Öffnen nicht leer ' +
      'ist. Erfinde sie im Stil der Felder oben; sie sind Anschauung, nicht die Daten des Nutzers. ' +
      'Sag ihm, dass seine eigenen Daten über **Import CSV → alle ersetzen** hineinkommen.',
    done: 'Fertig, wenn',
    doneItems: [
      '`npm run build` eine einzelne, geschlossene `dist/index.html` erzeugt',
      '`npm test` durchläuft',
      'die Datei per Doppelklick öffnet und die Beispieldatensätze zeigt',
      'die berechneten Felder Werte zeigen und die Regeln einen verstoßenden Datensatz abweisen',
      'Einstellungen, Farben und Startseite der Vorgabe oben entsprechen',
    ],
    handover: 'Vor der Übergabe',
    handoverBody:
      'Entscheide das selbst, statt es dem Empfänger zu überlassen: `copyright` auf den Eigentümer ' +
      'des Werkzeugs setzen, den Kopfzeilen-Verweis auf das openToolbox-Repository ersetzen und ' +
      '`examplePrompts` abschalten, wenn der Empfänger nur Daten pflegt. Den Aufrufzähler ' +
      '(Einstellungen → Sicherheit) bei der Übergabe ansprechen, statt ihn später in einem ' +
      'Netzwerkprotokoll entdecken zu lassen.',
    footer:
      'Erzeugt aus `examples/%s` — dem laufenden Quelltext der [Live-Demo](%s). Neu erzeugen mit ' +
      '`npm run prompts`.',
    disclaimer:
      'Alle Daten der Demo sind erfunden. Sie veranschaulicht die Struktur eines solchen Werkzeugs ' +
      '— sie ist keine Rechtsberatung und kein Nachweis von Konformität.',
  },
}

/* Die übrigen Sprachen erben die Struktur und übersetzen nur die Anweisung.
   Fachliche Inhalte bleiben unangetastet - siehe Kopfkommentar. */
L.es = {
  ...L.en,
  code: 'es',
  name: 'Español',
  intro: 'Constrúyeme esta herramienta',
  lead:
    'Todo lo que sigue es la especificación funcional. Síguela tal como está; donde calle, decide ' +
    'tú y di qué supusiste.',
  startHere: 'Punto de partida',
  startBody:
    'Usa la plantilla **openToolbox**: %s. Lee primero `AGENTS.md` en ese repositorio — es la ' +
    'autoridad sobre la forma del esquema, los tipos de campo y las reglas que rompen una ' +
    'compilación de archivo único. Todo lo específico del dominio va en un solo archivo, ' +
    '`src/domain.js`.',
  startSkill:
    'Si tienes instalado el skill de openToolbox (`claude plugin install opentoolbox@opentoolbox`), ' +
    'basta con pegar este archivo — él mismo se trae la plantilla.',
  problem: 'El problema que resuelve',
  result: 'Qué debe quedar al final',
  resultBody:
    'Un único archivo HTML autocontenido, que se abre con doble clic, sin servidor y sin ' +
    'instalación. El archivo es también la base de datos: guardar escribe un nuevo HTML con los ' +
    'registros incrustados.',
  records: 'Tipos de registro',
  recordsOne: 'El registro',
  entityIntro: 'Clave de entidad `%s` — un registro es **%s**, varios son **%s**.',
  singleIntro: 'Un registro es **%s**, varios son **%s**.',
  fields: 'Campos',
  thKey: 'Clave',
  thLabel: 'Etiqueta',
  thType: 'Tipo',
  thDetail: 'Detalle',
  required: 'obligatorio',
  longText: 'varias líneas',
  oneOf: 'uno de: %s',
  refTo: 'referencia a `%s`',
  computedFrom: 'calculado, nunca almacenado',
  attachmentNote: 'archivo adjunto, guardado en el registro',
  shortHead: 'cabecera de tabla `%s`',
  presentation: 'Presentación',
  titleField: 'Columna principal: `%s`',
  subFieldRow: 'Segunda línea debajo: `%s`',
  listRow: 'Columnas de la tabla, en este orden: %s',
  facetsRow: 'Filtros de la barra lateral: %s',
  searchRow: 'Campos que busca el buscador: %s',
  totalRow: 'Sumado en el resumen: `%s`',
  overdueRow: 'Se marca en rojo cuando: %s',
  doneRow: 'Deja de contar como abierto cuando: %s',
  computed: 'Campos calculados',
  computedIntro:
    'Se derivan en cada renderizado y nunca se escriben en el registro: una derivación almacenada ' +
    'queda obsoleta en cuanto cambia una de sus entradas.',
  rules: 'Reglas de validación',
  rulesIntro:
    'Condiciones entre campos. Deben aplicarse en un único lugar para que el formulario, la ' +
    'importación CSV y lo que proponga la IA pasen por la misma comprobación.',
  ruleWhen: 'Cuando',
  ruleThen: 'Entonces',
  ruleMessage: 'Mensaje',
  ruleAlways: 'siempre',
  savedViews: 'Vistas guardadas',
  savedViewsIntro:
    'Combinaciones con nombre de búsqueda, filtros y orden, que ofrece el desplegable de la ' +
    'cabecera. Lo que aquí se declara es lo que la herramienta lleva de serie; las propias ' +
    'vistas del destinatario viven bajo `settings.views`. Fusión: mismo nombre = gana la última ' +
    'edición.',
  savedViewsFields:
    '`name` (único), `query` (como la caja de búsqueda), `filters` (`{ campo: spec }`, donde un ' +
    '`spec` con solo `v` activa el filtro rápido del mismo nombre y un `spec` con `op` es un ' +
    'filtro de campo) y `sort` (`{ key, dir }`, `dir` vale `1` o `-1`). `entity` es opcional y ' +
    'queda para múltiples entidades.',
  savedViewPreset: 'propuesta: **%s**',
  board: 'Tablero',
  boardIntro:
    'Un Kanban opcional por entidad, abierto desde la barra de pestañas junto a *Lista* y *Panel*. ' +
    'Sin esta declaración la vista no existe — la misma postura que el Panel y la captura guiada: ' +
    'es la declaración en el esquema lo que la habilita.',
  boardFields:
    '`columnField` (clave de un campo enum existente — sus `values` definen las columnas en ese ' +
    'orden, de modo que el primer valor queda a la izquierda), `cardFields` (hasta tres claves ' +
    'adicionales que aparecen en cada tarjeta bajo el título; omitir toma los tres primeros campos ' +
    'que no sean título, columna, calculado ni adjunto) y `limit` (tope de tarjetas por columna, ' +
    'por defecto `50`). Arrastrar una tarjeta a otra columna pasa por el mismo `mutate` que el ' +
    'formulario, así que el movimiento entra en la pila de deshacer y en el registro de cambios. ' +
    'Las copias de solo lectura muestran el tablero sin arrastre.',
  boardColumn: 'las columnas vienen de los `values` del enum, en el orden declarado',
  boardUnassigned: 'los registros con valor vacío o que ya no está en `values` caen en un pequeño depósito *Sin asignar* a la derecha',
  dashboard: 'Panel',
  dashboardIntro: 'Fichas sobre todo el conjunto de registros, no sobre la vista filtrada.',
  tileStat: 'Un número: %s',
  tileBar: 'Barras por valor de `%s`, midiendo %s',
  tileDonut: 'Un anillo por valor de `%s`',
  tileFiltered: ' (solo registros que cumplen un filtro)',
  measureCount: 'el número de registros',
  metrics: 'Métricas',
  metricsIntro:
    'Declaradas en esta entidad a partir de un catálogo cerrado: recuento, suma y promedio sobre ' +
    'campos numéricos. Se calculan al renderizar y nunca se almacenan.',
  metricCount: 'el número de registros',
  metricSum: 'la suma de %s',
  metricAvg: 'el promedio de %s',
  metricsNote:
    'El framework formatea los promedios con dos decimales en la notación decimal del idioma de la ' +
    'interfaz, rechaza las declaraciones inválidas nombrándolas al cargar en lugar de ocultarlas, y ' +
    'un clic en una tarjeta salta a la lista de esa entidad, sin filtrar en esta versión.',
  wizard: 'Captura guiada',
  wizardIntro:
    'Una secuencia breve de pasos para quien tiene que reportar una cosa y no conoce la ' +
    'herramienta. No se escribe nada hasta confirmar el último paso: abandonarla no debe dejar ' +
    'rastro.',
  wizardTitle: 'Título: **%s**',
  wizardStep: 'Paso',
  wizardFields: 'campos: %s',
  wizardCsv: 'subida de CSV, que alimenta la misma sesión',
  wizardReview: 'resumen generado a partir del esquema',
  wizardWhen: 'solo cuando: %s',
  wizardDone: 'Pantalla final: «%s»',
  settings: 'Valores por defecto',
  settingsIntro: 'Ponlos en `DEFAULT_SETTINGS`, `DEFAULT_COLORS` y `DEFAULT_HOME` en `src/app.jsx`.',
  setTitle: 'Título',
  setSubtitle: 'Subtítulo',
  setFile: 'Nombre de archivo',
  setVersion: 'Versión',
  setLocale: 'Idioma de la interfaz',
  setMode: 'Se abre como',
  setModeIntake: 'captura guiada (la lista queda oculta)',
  setModeWorkbench: 'herramienta completa',
  setColors: 'Colores',
  startPage: 'Página de inicio',
  startPageIntro:
    'La aplicación abre con este texto. Es un subconjunto de Markdown: títulos, listas, citas, ' +
    'negrita, cursiva, código en línea y enlaces. Úsalo literalmente:',
  seedHead: 'Datos de ejemplo',
  seedBody:
    'Añade %s registros de ejemplo realistas para que el archivo no esté vacío al abrirlo. ' +
    'Invéntalos al estilo de los campos anteriores; son ilustración, no los datos del usuario. ' +
    'Dile que sus datos entran por **Import CSV → replace all**.',
  done: 'Terminado cuando',
  doneItems: [
    '`npm run build` produce un único `dist/index.html` autocontenido',
    '`npm test` pasa',
    'el archivo se abre con doble clic y muestra los registros de ejemplo',
    'los campos calculados muestran valores y las reglas rechazan un registro que las incumpla',
    'los ajustes, colores y página de inicio coinciden con lo especificado arriba',
  ],
  handover: 'Antes de entregarla',
  handoverBody:
    'Decide esto tú, no lo dejes al destinatario: pon `copyright` a quien sea dueño de la ' +
    'herramienta, sustituye el enlace de cabecera que apunta al repositorio de openToolbox y ' +
    'desactiva `examplePrompts` si el destinatario solo introduce datos. Menciona el contador de ' +
    'aperturas (Ajustes → Seguridad) al entregarla.',
  footer:
    'Generado a partir de `examples/%s`, el código real de la [demo en vivo](%s). Regenerar con ' +
    '`npm run prompts`.',
  disclaimer:
    'Todos los datos de la demo son inventados. Ilustra la estructura de una herramienta así — no ' +
    'es asesoramiento legal ni prueba de conformidad.',
}

L.fr = {
  ...L.en,
  code: 'fr',
  name: 'Français',
  intro: 'Construis-moi cet outil',
  lead:
    'Tout ce qui suit est la spécification fonctionnelle. Suis-la telle quelle ; là où elle se ' +
    'tait, tranche toi-même et dis ce que tu as supposé.',
  startHere: 'Point de départ',
  startBody:
    'Utilise le modèle **openToolbox** : %s. Lis d’abord `AGENTS.md` dans ce dépôt — il fait ' +
    'autorité sur la forme du schéma, les types de champs et les règles qui cassent une ' +
    'construction en fichier unique. Tout le métier tient dans un seul fichier, `src/domain.js`.',
  startSkill:
    'Si le skill openToolbox est installé (`claude plugin install opentoolbox@opentoolbox`), il ' +
    'suffit de coller ce fichier — il récupère le modèle lui-même.',
  problem: 'Le problème traité',
  result: 'Ce qui doit exister à la fin',
  resultBody:
    'Un seul fichier HTML autonome, ouvert par double-clic, sans serveur ni installation. Le ' +
    'fichier est aussi la base de données : enregistrer écrit un nouveau HTML avec les ' +
    'enregistrements intégrés.',
  records: 'Types d’enregistrement',
  recordsOne: 'L’enregistrement',
  entityIntro: 'Clé d’entité `%s` — un enregistrement est **%s**, plusieurs sont **%s**.',
  singleIntro: 'Un enregistrement est **%s**, plusieurs sont **%s**.',
  fields: 'Champs',
  thKey: 'Clé',
  thLabel: 'Libellé',
  thType: 'Type',
  thDetail: 'Détail',
  required: 'obligatoire',
  longText: 'multiligne',
  oneOf: 'l’une de : %s',
  refTo: 'référence vers `%s`',
  computedFrom: 'calculé, jamais stocké',
  attachmentNote: 'fichier joint, stocké dans l’enregistrement',
  shortHead: 'en-tête de tableau `%s`',
  presentation: 'Présentation',
  titleField: 'Colonne principale : `%s`',
  subFieldRow: 'Deuxième ligne en dessous : `%s`',
  listRow: 'Colonnes du tableau, dans cet ordre : %s',
  facetsRow: 'Filtres de la barre latérale : %s',
  searchRow: 'Champs interrogés par la recherche : %s',
  totalRow: 'Totalisé dans l’aperçu : `%s`',
  overdueRow: 'Signalé en rouge quand : %s',
  doneRow: 'Ne compte plus comme ouvert quand : %s',
  computed: 'Champs calculés',
  computedIntro:
    'Ils sont dérivés à chaque affichage et jamais écrits dans l’enregistrement : une dérivation ' +
    'stockée devient fausse dès qu’une de ses sources change.',
  rules: 'Règles de validation',
  rulesIntro:
    'Conditions entre champs. Elles doivent s’appliquer en un seul endroit, afin que le ' +
    'formulaire, l’import CSV et les propositions de l’IA passent par le même contrôle.',
  ruleWhen: 'Quand',
  ruleThen: 'Alors',
  ruleMessage: 'Message',
  ruleAlways: 'toujours',
  savedViews: 'Vues enregistrées',
  savedViewsIntro:
    'Combinaisons nommées de recherche, filtres et tri, proposées par le menu déroulant en tête ' +
    'de liste. Ce qui est déclaré ici est ce que l’outil embarque ; les propres vues du ' +
    'destinataire vivent sous `settings.views`. Fusion : même nom = la dernière édition gagne.',
  savedViewsFields:
    '`name` (unique), `query` (comme la zone de recherche), `filters` (`{ champ : spec }`, où un ' +
    '`spec` avec seulement `v` actionne le filtre rapide du même nom, et un `spec` avec `op` est ' +
    'un filtre de champ) et `sort` (`{ key, dir }`, `dir` vaut `1` ou `-1`). `entity` est ' +
    'optionnel et réservé au multi-entité.',
  savedViewPreset: 'proposition : **%s**',
  board: 'Tableau',
  boardIntro:
    'Un Kanban facultatif par entité, ouvert depuis la barre d’onglets à côté de *Liste* et ' +
    '*Tableau de bord*. Sans cette déclaration, la vue n’existe pas — même posture que pour le ' +
    'tableau de bord et la saisie guidée : c’est la déclaration dans le schéma qui l’active.',
  boardFields:
    '`columnField` (clé d’un champ enum existant — ses `values` définissent les colonnes dans cet ' +
    'ordre, la première valeur à gauche), `cardFields` (jusqu’à trois autres clés de champ ' +
    'affichées sous le titre de chaque carte ; omis, prend les trois premiers champs qui ne sont ' +
    'ni titre, ni colonne, ni calculé, ni pièce jointe) et `limit` (plafond de cartes par colonne, ' +
    'par défaut `50`). Faire glisser une carte vers une autre colonne passe par le même `mutate` ' +
    'que le formulaire — le mouvement entre dans la pile d’annulation et dans le journal des ' +
    'modifications. Les copies en lecture seule affichent le tableau sans glisser-déposer.',
  boardColumn: 'les colonnes viennent des `values` de l’enum, dans l’ordre déclaré',
  boardUnassigned: 'les enregistrements dont la valeur est vide ou n’est plus dans `values` aboutissent dans un petit réservoir « Non assignés » à droite',
  dashboard: 'Tableau de bord',
  dashboardIntro: 'Tuiles sur l’ensemble des enregistrements, pas sur la vue filtrée.',
  tileStat: 'Un nombre : %s',
  tileBar: 'Barres par valeur de `%s`, mesurant %s',
  tileDonut: 'Un anneau par valeur de `%s`',
  tileFiltered: ' (uniquement les enregistrements correspondant à un filtre)',
  measureCount: 'le nombre d’enregistrements',
  metrics: 'Mesures',
  metricsIntro:
    'Déclarées sur cette entité à partir d’un catalogue fermé : comptage, somme et moyenne sur ' +
    'des champs numériques. Calculées au rendu, jamais stockées.',
  metricCount: 'le nombre d’enregistrements',
  metricSum: 'la somme de %s',
  metricAvg: 'la moyenne de %s',
  metricsNote:
    'Le cadre formate les moyennes avec deux décimales dans la notation décimale de la langue de ' +
    'l’interface, rejette les déclarations invalides en les nommant au chargement au lieu de les ' +
    'masquer, et un clic sur une tuile mène à la liste de cette entité, sans filtre dans cette version.',
  wizard: 'Saisie guidée',
  wizardIntro:
    'Une courte séquence d’étapes pour quelqu’un qui doit signaler une chose et ne connaît pas ' +
    'l’outil. Rien n’est écrit avant la validation de la dernière étape : abandonner ne doit rien ' +
    'laisser.',
  wizardTitle: 'Titre : **%s**',
  wizardStep: 'Étape',
  wizardFields: 'champs : %s',
  wizardCsv: 'téléversement CSV, alimentant la même session',
  wizardReview: 'récapitulatif généré à partir du schéma',
  wizardWhen: 'uniquement si : %s',
  wizardDone: 'Écran final : « %s »',
  settings: 'Valeurs par défaut',
  settingsIntro:
    'À définir dans `DEFAULT_SETTINGS`, `DEFAULT_COLORS` et `DEFAULT_HOME` dans `src/app.jsx`.',
  setTitle: 'Titre',
  setSubtitle: 'Sous-titre',
  setFile: 'Nom de fichier',
  setVersion: 'Version',
  setLocale: 'Langue de l’interface',
  setMode: 'S’ouvre en',
  setModeIntake: 'saisie guidée (la liste reste masquée)',
  setModeWorkbench: 'outil complet',
  setColors: 'Couleurs',
  startPage: 'Page d’accueil',
  startPageIntro:
    'L’application s’ouvre sur ce texte. C’est un sous-ensemble de Markdown : titres, listes, ' +
    'citations, gras, italique, code en ligne et liens. À reprendre tel quel :',
  seedHead: 'Données de démonstration',
  seedBody:
    'Ajoute %s enregistrements de démonstration réalistes pour que le fichier ne soit pas vide à ' +
    'l’ouverture. Invente-les dans l’esprit des champs ci-dessus ; ce sont des illustrations, pas ' +
    'les données de l’utilisateur. Dis-lui que ses propres données entrent par ' +
    '**Import CSV → replace all**.',
  done: 'Terminé quand',
  doneItems: [
    '`npm run build` produit un seul `dist/index.html` autonome',
    '`npm test` passe',
    'le fichier s’ouvre par double-clic et affiche les enregistrements de démonstration',
    'les champs calculés affichent des valeurs et les règles refusent un enregistrement fautif',
    'les réglages, les couleurs et la page d’accueil correspondent à la spécification ci-dessus',
  ],
  handover: 'Avant de la livrer',
  handoverBody:
    'Tranche toi-même plutôt que de laisser le destinataire décider : mets `copyright` au nom du ' +
    'propriétaire de l’outil, remplace le lien d’en-tête pointant vers le dépôt openToolbox, et ' +
    'désactive `examplePrompts` si le destinataire ne fait que saisir des données. Mentionne le ' +
    'compteur d’ouvertures (Réglages → Sécurité) à la livraison.',
  footer:
    'Généré à partir de `examples/%s`, le code réel de la [démo en ligne](%s). Régénérer avec ' +
    '`npm run prompts`.',
  disclaimer:
    'Toutes les données de la démo sont inventées. Elle illustre la structure d’un tel outil — ce ' +
    'n’est ni un conseil juridique ni une preuve de conformité.',
}

L.pt = {
  ...L.en,
  code: 'pt',
  name: 'Português',
  intro: 'Construa esta ferramenta para mim',
  lead:
    'Tudo o que segue é a especificação funcional. Siga-a como está; onde ela se calar, decida e ' +
    'diga o que assumiu.',
  startHere: 'Ponto de partida',
  startBody:
    'Use o modelo **openToolbox**: %s. Leia primeiro o `AGENTS.md` desse repositório — ele é a ' +
    'autoridade sobre a forma do esquema, os tipos de campo e as regras que quebram uma ' +
    'compilação de arquivo único. Tudo o que é do domínio vai em um único arquivo, `src/domain.js`.',
  startSkill:
    'Se o skill do openToolbox estiver instalado (`claude plugin install opentoolbox@opentoolbox`), ' +
    'basta colar este arquivo — ele mesmo busca o modelo.',
  problem: 'O problema por trás disso',
  result: 'O que precisa existir no fim',
  resultBody:
    'Um único arquivo HTML autocontido, aberto com duplo clique, sem servidor e sem instalação. O ' +
    'arquivo também é o banco de dados: salvar escreve um novo HTML com os registros embutidos.',
  records: 'Tipos de registro',
  recordsOne: 'O registro',
  entityIntro: 'Chave de entidade `%s` — um registro é **%s**, vários são **%s**.',
  singleIntro: 'Um registro é **%s**, vários são **%s**.',
  fields: 'Campos',
  thKey: 'Chave',
  thLabel: 'Rótulo',
  thType: 'Tipo',
  thDetail: 'Detalhe',
  required: 'obrigatório',
  longText: 'multilinha',
  oneOf: 'um de: %s',
  refTo: 'referência para `%s`',
  computedFrom: 'calculado, nunca armazenado',
  attachmentNote: 'arquivo anexado, guardado no registro',
  shortHead: 'cabeçalho de tabela `%s`',
  presentation: 'Apresentação',
  titleField: 'Coluna principal: `%s`',
  subFieldRow: 'Segunda linha abaixo: `%s`',
  listRow: 'Colunas da tabela, nesta ordem: %s',
  facetsRow: 'Filtros da barra lateral: %s',
  searchRow: 'Campos usados pela busca: %s',
  totalRow: 'Somado no resumo: `%s`',
  overdueRow: 'Marcado em vermelho quando: %s',
  doneRow: 'Deixa de contar como aberto quando: %s',
  computed: 'Campos calculados',
  computedIntro:
    'São derivados a cada renderização e nunca gravados no registro — uma derivação armazenada ' +
    'fica desatualizada assim que uma de suas entradas muda.',
  rules: 'Regras de validação',
  rulesIntro:
    'Condições entre campos. Precisam valer em um único lugar, para que o formulário, a importação ' +
    'CSV e o que a IA propuser passem pela mesma verificação.',
  ruleWhen: 'Quando',
  ruleThen: 'Então',
  ruleMessage: 'Mensagem',
  ruleAlways: 'sempre',
  savedViews: 'Vistas guardadas',
  savedViewsIntro:
    'Combinações nomeadas de busca, filtros e ordenação, oferecidas pelo menu na cabeça da lista. ' +
    'O que é declarado aqui é o que a ferramenta traz de fábrica; as vistas do destinatário ficam ' +
    'em `settings.views`. Fusão: mesmo nome = ganha a última edição.',
  savedViewsFields:
    '`name` (único), `query` (como o campo de busca), `filters` (`{ campo: spec }`, onde um `spec` ' +
    'com apenas `v` aciona o filtro rápido do mesmo nome e um `spec` com `op` é um filtro de ' +
    'campo) e `sort` (`{ key, dir }`, `dir` vale `1` ou `-1`). `entity` é opcional e fica ' +
    'reservado para múltiplas entidades.',
  savedViewPreset: 'proposta: **%s**',
  board: 'Quadro',
  boardIntro:
    'Um Kanban opcional por entidade, aberto a partir da faixa de abas ao lado de *Lista* e ' +
    '*Painel*. Sem essa declaração a vista não existe — mesma postura que o Painel e a captura ' +
    'guiada: é a declaração no esquema que a habilita.',
  boardFields:
    '`columnField` (chave de um campo enum existente — seus `values` definem as colunas nessa ' +
    'ordem, de modo que o primeiro valor fica à esquerda), `cardFields` (até três chaves de campo ' +
    'adicionais mostradas em cada cartão sob o título; omitir pega os três primeiros campos que ' +
    'não sejam título, coluna, calculado nem anexo) e `limit` (teto de cartões por coluna, padrão ' +
    '`50`). Arrastar um cartão para outra coluna passa pelo mesmo `mutate` do formulário — o ' +
    'movimento entra na pilha de desfazer e no registro de alterações. Cópias somente leitura ' +
    'mostram o quadro sem arrastar.',
  boardColumn: 'as colunas vêm dos `values` do enum, na ordem declarada',
  boardUnassigned: 'registros com valor vazio ou que já não está em `values` caem num pequeno reservatório *Sem atribuição* à direita',
  dashboard: 'Painel',
  dashboardIntro: 'Blocos sobre todo o conjunto de registros, não sobre a visão filtrada.',
  tileStat: 'Um número: %s',
  tileBar: 'Barras por valor de `%s`, medindo %s',
  tileDonut: 'Um anel por valor de `%s`',
  tileFiltered: ' (apenas registros que atendem a um filtro)',
  measureCount: 'a quantidade de registros',
  metrics: 'Medidas',
  metricsIntro:
    'Declaradas nesta entidade a partir de um catálogo fechado: contagem, soma e média sobre ' +
    'campos numéricos. Calculadas ao renderizar, nunca armazenadas.',
  metricCount: 'a quantidade de registros',
  metricSum: 'a soma de %s',
  metricAvg: 'a média de %s',
  metricsNote:
    'O framework formata médias com duas casas decimais na notação decimal do idioma da interface, ' +
    'rejeita declarações inválidas nomeando-as ao carregar em vez de escondê-las, e um clique numa ' +
    'medida leva à lista dessa entidade, sem filtro nesta versão.',
  wizard: 'Captura guiada',
  wizardIntro:
    'Uma sequência curta de passos para quem precisa relatar uma coisa e não conhece a ferramenta. ' +
    'Nada é gravado antes da confirmação do último passo — abandonar não pode deixar rastro.',
  wizardTitle: 'Título: **%s**',
  wizardStep: 'Passo',
  wizardFields: 'campos: %s',
  wizardCsv: 'upload de CSV, alimentando a mesma sessão',
  wizardReview: 'resumo gerado a partir do esquema',
  wizardWhen: 'somente quando: %s',
  wizardDone: 'Tela final: “%s”',
  settings: 'Padrões',
  settingsIntro: 'Defina em `DEFAULT_SETTINGS`, `DEFAULT_COLORS` e `DEFAULT_HOME` em `src/app.jsx`.',
  setTitle: 'Título',
  setSubtitle: 'Subtítulo',
  setFile: 'Nome do arquivo',
  setVersion: 'Versão',
  setLocale: 'Idioma da interface',
  setMode: 'Abre como',
  setModeIntake: 'captura guiada (a lista fica oculta)',
  setModeWorkbench: 'ferramenta completa',
  setColors: 'Cores',
  startPage: 'Página inicial',
  startPageIntro:
    'O aplicativo abre com este texto. É um subconjunto pequeno de Markdown: títulos, listas, ' +
    'citações, negrito, itálico, código embutido e links. Use-o literalmente:',
  seedHead: 'Dados de demonstração',
  seedBody:
    'Acrescente %s registros de demonstração realistas para que o arquivo não esteja vazio ao ' +
    'abrir. Invente-os no estilo dos campos acima; são ilustração, não os dados do usuário. Diga a ' +
    'ele que os próprios dados entram por **Import CSV → replace all**.',
  done: 'Pronto quando',
  doneItems: [
    '`npm run build` produz um único `dist/index.html` autocontido',
    '`npm test` passa',
    'o arquivo abre com duplo clique e mostra os registros de demonstração',
    'os campos calculados mostram valores e as regras recusam um registro que as viole',
    'as configurações, cores e página inicial correspondem à especificação acima',
  ],
  handover: 'Antes de entregar',
  handoverBody:
    'Decida você, em vez de deixar para o destinatário: defina `copyright` para quem é dono da ' +
    'ferramenta, substitua o link do cabeçalho que aponta para o repositório do openToolbox e ' +
    'desligue `examplePrompts` se o destinatário apenas registra dados. Mencione o contador de ' +
    'aberturas (Configurações → Segurança) na entrega.',
  footer:
    'Gerado a partir de `examples/%s`, o código real da [demo ao vivo](%s). Gerar de novo com ' +
    '`npm run prompts`.',
  disclaimer:
    'Todos os dados da demo são inventados. Ela ilustra a estrutura de uma ferramenta assim — não ' +
    'é aconselhamento jurídico nem prova de conformidade.',
}

L.zh = {
  ...L.en,
  code: 'zh',
  name: '中文',
  intro: '请帮我做这个工具',
  lead: '下面是完整的功能需求。请照此实现；需求没说到的地方由你判断，并说明你的假设。',
  startHere: '从哪里开始',
  startBody:
    '使用 **openToolbox** 模板：%s。先读该仓库里的 `AGENTS.md` —— 它是 schema 形态、字段类型以及' +
    '「哪些做法会破坏单文件构建」的权威说明。所有业务相关的内容只写进一个文件：`src/domain.js`。',
  startSkill:
    '如果已安装 openToolbox skill（`claude plugin install opentoolbox@opentoolbox`），直接粘贴本文件即可，' +
    '它会自己去取模板。',
  problem: '它解决的问题',
  result: '最终必须交付什么',
  resultBody:
    '一个自包含的 HTML 文件，双击即可打开，无需服务器、无需安装。文件本身就是数据库：保存会写出一个新的 ' +
    'HTML 文件，数据嵌在其中。',
  records: '记录类型',
  recordsOne: '记录',
  entityIntro: '实体键 `%s` —— 一条记录是 **%s**，多条是 **%s**。',
  singleIntro: '一条记录是 **%s**，多条是 **%s**。',
  fields: '字段',
  thKey: '键',
  thLabel: '标签',
  thType: '类型',
  thDetail: '说明',
  required: '必填',
  longText: '多行',
  oneOf: '取值之一：%s',
  refTo: '引用 `%s`',
  computedFrom: '计算得出，从不存储',
  attachmentNote: '上传的文件，存放在记录内',
  shortHead: '表头 `%s`',
  presentation: '呈现方式',
  titleField: '主列：`%s`',
  subFieldRow: '主列下方的第二行：`%s`',
  listRow: '表格列，按此顺序：%s',
  facetsRow: '侧栏筛选：%s',
  searchRow: '搜索框检索的字段：%s',
  totalRow: '在概览中求和：`%s`',
  overdueRow: '标红的条件：%s',
  doneRow: '不再计为未完成的条件：%s',
  computed: '计算字段',
  computedIntro: '每次渲染时求值，绝不写回记录 —— 一旦某个输入变化，存下来的派生值当场就是错的。',
  rules: '校验规则',
  rulesIntro: '跨字段的条件。必须只在一处生效，使表单、CSV 导入和 AI 提出的改动都走同一套检查。',
  ruleWhen: '当',
  ruleThen: '则',
  ruleMessage: '提示语',
  ruleAlways: '始终',
  savedViews: '保存视图',
  savedViewsIntro:
    '由列表头部的下拉框按名称提供的「搜索词 + 字段筛选 + 排序」组合。这里声明的就是工具自带的内容；' +
    '使用者自己的视图保存在 `settings.views`。合并规则：同名以最后一次的修改为准。',
  savedViewsFields:
    '`name`（唯一）、`query`（与搜索框相同）、`filters`（`{ 字段: spec }`；只带 `v` 的 `spec` 触发同名快速' +
    '筛选，带 `op` 的 `spec` 是字段筛选），以及 `sort`（`{ key, dir }`，`dir` 取 `1` 或 `-1`）。' +
    '`entity` 是可选字段，为多实体预留。',
  savedViewPreset: '预设：**%s**',
  board: '看板',
  boardIntro:
    '每个实体可选的看板视图，通过 *列表* 与 *仪表板* 旁边的标签栏打开。没有此声明时视图根本不存在——' +
    '与仪表板和引导式录入同样的态度：由 schema 中的声明启用它。',
  boardFields:
    '`columnField`（已存在的 enum 字段键——其 `values` 按声明顺序决定列，第一个值位于最左）、' +
    '`cardFields`（最多三个其它字段键，显示在每张卡片标题下方；省略时取前三个非标题、非列、' +
    '非计算、非附件字段）、`limit`（每列卡片上限，默认 `50`）。把一张卡片拖到另一列走的是表单' +
    '同样的 `mutate` 路径——变更进入撤销栈和变更日志。只读副本上的看板禁用拖动。',
  boardColumn: '列由 enum 的 `values` 决定，按声明顺序排列',
  boardUnassigned: '字段值为空或已不在 `values` 中的记录，落到右侧一个小的「未分配」容器里',
  dashboard: '仪表板',
  dashboardIntro: '统计整个记录集，而不是筛选后的视图。',
  tileStat: '一个数字：%s',
  tileBar: '按 `%s` 的取值分组的条形，度量 %s',
  tileDonut: '按 `%s` 的取值分组的环形图',
  tileFiltered: '（仅符合筛选条件的记录）',
  measureCount: '记录条数',
  metrics: '指标卡片',
  metricsIntro: '在该实体上从封闭目录声明——记录条数、数值字段的求和与平均值。渲染时计算，绝不存储。',
  metricCount: '记录条数',
  metricSum: '%s 之和',
  metricAvg: '%s 的平均值',
  metricsNote:
    '框架以两位小数、按界面语言的小数符号格式化平均值；加载时点名拒绝无效声明，而非静默隐藏；点击卡片会跳转到该实体的列表，本版本中不带筛选。',
  wizard: '引导式录入',
  wizardIntro:
    '给「只需报告一件事、并不熟悉这个工具」的人用的一串短步骤。在最后一步确认之前不写入任何数据 —— ' +
    '中途放弃必须不留痕迹。',
  wizardTitle: '标题：**%s**',
  wizardStep: '步骤',
  wizardFields: '字段：%s',
  wizardCsv: 'CSV 上传，并入同一次录入',
  wizardReview: '由 schema 自动生成的摘要',
  wizardWhen: '仅当：%s',
  wizardDone: '结束页：“%s”',
  settings: '默认设置',
  settingsIntro: '在 `src/app.jsx` 的 `DEFAULT_SETTINGS`、`DEFAULT_COLORS` 和 `DEFAULT_HOME` 中设置。',
  setTitle: '标题',
  setSubtitle: '副标题',
  setFile: '文件名',
  setVersion: '版本',
  setLocale: '界面语言',
  setMode: '打开方式',
  setModeIntake: '引导式录入（隐藏列表）',
  setModeWorkbench: '完整工具',
  setColors: '配色',
  startPage: '起始页',
  startPageIntro:
    '应用以这段文字作为起始页。它是一个很小的 Markdown 子集：标题、列表、引用、加粗、斜体、行内代码和链接。' +
    '请原样使用：',
  seedHead: '示例数据',
  seedBody:
    '添加 %s 条真实感的示例记录，使文件初次打开时不为空。按上面的字段风格自行编写；它们只是示例，不是用户的数据。' +
    '告诉用户，他自己的数据通过 **Import CSV → replace all** 导入。',
  done: '完成的标准',
  doneItems: [
    '`npm run build` 产出单个自包含的 `dist/index.html`',
    '`npm test` 通过',
    '双击可打开，并显示示例记录',
    '计算字段有值，规则会拒绝违反它们的记录',
    '设置、配色和起始页与上面的规格一致',
  ],
  handover: '交付之前',
  handoverBody:
    '这些由你决定，不要留给接收方：把 `copyright` 设为工具的归属方，替换指向 openToolbox 仓库的顶栏链接，' +
    '若接收方只录入数据就关闭 `examplePrompts`。交付时主动说明使用计数器（设置 → 安全）。',
  footer: '由 `examples/%s` 生成 —— 即[在线演示](%s)的真实源码。重新生成：`npm run prompts`。',
  disclaimer: '演示中的数据均为虚构。它展示的是这类工具的结构，不构成法律建议，也不能作为合规证明。',
}

L.ja = {
  ...L.en,
  code: 'ja',
  name: '日本語',
  intro: 'このツールを作ってください',
  lead:
    '以下がすべて機能要件です。書かれているとおりに実装してください。書かれていない点は自分で判断し、' +
    '何を前提にしたかを述べてください。',
  startHere: '出発点',
  startBody:
    '**openToolbox** テンプレートを使ってください：%s。まずそのリポジトリの `AGENTS.md` を読むこと — ' +
    'スキーマの形、フィールド型、単一ファイルビルドを壊す禁止事項について、そこが正典です。' +
    '業務固有の内容はすべて `src/domain.js` 一つに収めます。',
  startSkill:
    'openToolbox skill を導入済みなら（`claude plugin install opentoolbox@opentoolbox`）、' +
    'このファイルを貼るだけで足ります。テンプレートは skill が自分で取得します。',
  problem: '背景にある問題',
  result: '最終的に何が出来ていればよいか',
  resultBody:
    'ダブルクリックで開ける自己完結型の HTML ファイル 1 つ。サーバーもインストールも不要です。' +
    'ファイル自体がデータベースでもあり、保存するとレコードを埋め込んだ新しい HTML ファイルが書き出されます。',
  records: 'レコード種別',
  recordsOne: 'レコード',
  entityIntro: 'エンティティキー `%s` — 1 件は **%s**、複数は **%s**。',
  singleIntro: '1 件は **%s**、複数は **%s**。',
  fields: 'フィールド',
  thKey: 'キー',
  thLabel: 'ラベル',
  thType: '型',
  thDetail: '補足',
  required: '必須',
  longText: '複数行',
  oneOf: '次のいずれか：%s',
  refTo: '`%s` への参照',
  computedFrom: '計算値。保存はしない',
  attachmentNote: 'アップロードしたファイル。レコード内に格納',
  shortHead: '表ヘッダー `%s`',
  presentation: '表示',
  titleField: '主列：`%s`',
  subFieldRow: '主列の下に置く 2 行目：`%s`',
  listRow: '表の列（この順）：%s',
  facetsRow: 'サイドバーの絞り込み：%s',
  searchRow: '検索対象のフィールド：%s',
  totalRow: '概要で合計する：`%s`',
  overdueRow: '赤で強調する条件：%s',
  doneRow: '未完了として数えなくなる条件：%s',
  computed: '計算フィールド',
  computedIntro:
    '描画のたびに算出し、レコードには絶対に書き戻しません。保存した派生値は、入力のどれかが変わった' +
    '瞬間に誤りになります。',
  rules: '検証ルール',
  rulesIntro:
    'フィールドをまたぐ条件です。入力フォーム、CSV 取り込み、AI の提案がすべて同じチェックを通るよう、' +
    '一箇所で効かせてください。',
  ruleWhen: '条件',
  ruleThen: '要求',
  ruleMessage: 'メッセージ',
  ruleAlways: '常に',
  savedViews: '保存ビュー',
  savedViewsIntro:
    '検索・絞り込み・並び替えをまとめた名前付きの組み合わせを、リスト先頭のドロップダウンで提供します。' +
    'ここで宣言したものがツールに同梱されます。受取側独自のビューは `settings.views` に保存されます。' +
    'マージ：同じ名前では最後に編集した側が勝ちます。',
  savedViewsFields:
    '`name`（一意）、`query`（検索ボックスと同じ）、`filters`（`{ フィールド: spec }`。`v` のみの ' +
    '`spec` は同名ファセットを起動し、`op` 付きの `spec` はフィールドフィルタ）、`sort`（`{ key, dir }`、' +
    '`dir` は `1` か `-1`）。`entity` は任意で、複数エンティティ用に予約されています。',
  savedViewPreset: 'プリセット：**%s**',
  board: 'ボード',
  boardIntro:
    'エンティティごとの任意の Kanban で、*リスト* と *ダッシュボード* の横にあるタブ列から開きます。' +
    'この宣言がなければビュー自体が存在しません。ダッシュボードやガイド付き入力と同じ姿勢です——' +
    'スキーマでの宣言があって初めて有効になります。',
  boardFields:
    '`columnField`（既存の enum フィールドのキー。`values` が宣言順に列となり、最初の値が左端）、' +
    '`cardFields`（カードのタイトル下に表示される最大 3 つの追加フィールドキー。省略時はタイトル・' +
    '列・計算・添付ではない最初の 3 フィールド）、`limit`（列ごとのカード上限、デフォルト `50`）。' +
    'カードを別の列へドラッグすると、フォームと同じ `mutate` を通るため、操作は Undo スタックと ' +
    '変更ログに載ります。読み取り専用コピーのボードではドラッグが無効になります。',
  boardColumn: '列は enum の `values` を宣言順に並べたもの',
  boardUnassigned: '値が空、もしくは `values` に無いレコードは右側の小さな『未分類』に入ります',
  dashboard: 'ダッシュボード',
  dashboardIntro: '絞り込み後ではなく、レコード全体を対象とするタイルです。',
  tileStat: '数値 1 つ：%s',
  tileBar: '`%s` の値ごとの棒。指標は %s',
  tileDonut: '`%s` の値ごとのドーナツ',
  tileFiltered: '（フィルタに一致するレコードのみ）',
  measureCount: '件数',
  metrics: '指標タイル',
  metricsIntro: 'このエンティティに閉じたカタログから宣言します——件数、数値フィールドの合計と平均。描画時に計算され、保存されません。',
  metricCount: '件数',
  metricSum: '%s の合計',
  metricAvg: '%s の平均',
  metricsNote:
    'フレームワークは平均を小数点以下2桁で、インターフェース言語の小数記号により書式化し、無効な宣言は黙って隠さず読み込み時に名前付きで拒否します。タイルをクリックすると、このバージョンでは絞り込みなしでそのエンティティのリストに移動します。',
  wizard: 'ガイド付き入力',
  wizardIntro:
    '1 件だけ報告すればよく、ツールに不慣れな人のための短い手順です。最後の手順を確定するまで何も' +
    '書き込まれません。途中でやめても何も残らないこと。',
  wizardTitle: 'タイトル：**%s**',
  wizardStep: 'ステップ',
  wizardFields: 'フィールド：%s',
  wizardCsv: 'CSV 取り込み。同じ入力セッションに合流します',
  wizardReview: 'スキーマから生成される確認画面',
  wizardWhen: '次の場合のみ表示：%s',
  wizardDone: '完了画面：「%s」',
  settings: '既定値',
  settingsIntro: '`src/app.jsx` の `DEFAULT_SETTINGS`、`DEFAULT_COLORS`、`DEFAULT_HOME` に設定します。',
  setTitle: 'タイトル',
  setSubtitle: 'サブタイトル',
  setFile: 'ファイル名',
  setVersion: 'バージョン',
  setLocale: '画面の言語',
  setMode: '起動時の表示',
  setModeIntake: 'ガイド付き入力（一覧は隠す）',
  setModeWorkbench: '通常のツール',
  setColors: '配色',
  startPage: 'スタートページ',
  startPageIntro:
    'アプリはこの文章から始まります。Markdown の小さな部分集合（見出し、箇条書き、引用、太字、斜体、' +
    'インラインコード、リンク）です。そのまま使ってください：',
  seedHead: 'サンプルデータ',
  seedBody:
    '初回起動時に空にならないよう、現実味のあるサンプルレコードを %s 件用意してください。' +
    '上のフィールドに合わせて創作します。これは例示であってユーザーのデータではありません。' +
    '本番データは **Import CSV → replace all** から入れる、と伝えてください。',
  done: '完了条件',
  doneItems: [
    '`npm run build` が自己完結した `dist/index.html` を 1 つ出力する',
    '`npm test` が通る',
    'ダブルクリックで開き、サンプルレコードが表示される',
    '計算フィールドに値が出て、ルールに反するレコードは保存を拒否される',
    '設定・配色・スタートページが上の仕様どおりである',
  ],
  handover: '引き渡す前に',
  handoverBody:
    '受け取る側に委ねず、自分で決めてください：`copyright` をツールの所有者に設定し、openToolbox ' +
    'リポジトリを指すヘッダーリンクを差し替え、相手がデータ入力だけなら `examplePrompts` を切ります。' +
    '利用カウンター（設定 → セキュリティ）は引き渡し時に自分から伝えること。',
  footer:
    '`examples/%s` から生成 — [ライブデモ](%s) の実際のソースです。再生成は `npm run prompts`。',
  disclaimer:
    'デモのデータはすべて架空です。この種のツールの構造を示すものであり、法的助言でも適合性の証明でも' +
    'ありません。',
}

export const LANGS = ['en', 'de', 'es', 'fr', 'pt', 'zh', 'ja']
export const strings = L
