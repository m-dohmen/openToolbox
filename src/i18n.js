// SPDX-License-Identifier: Apache-2.0
/**
 * Übersetzung der Anwendungs-Oberfläche (Buttons, Dialoge, Meldungen) - nicht des
 * Schemas. Feldnamen, Aufzählungswerte und Beispieldaten bleiben Sache von
 * src/domain.js und werden vom Werkzeugbauer selbst in der gewünschten Sprache
 * angelegt; hier geht es nur um die Bedienelemente, die jedes Werkzeug teilt.
 *
 * Neue Sprache ergänzen: einen Eintrag in STRINGS kopieren (z.B. `de`), den
 * Sprachcode zu LOCALES und LOCALE_LABELS hinzufügen, jeden Wert übersetzen.
 * Nichts sonst muss angefasst werden - siehe README, Abschnitt "Sprachen".
 */

export const DEFAULT_LOCALE = 'en'

export const LOCALES = ['en', 'de']

export const LOCALE_LABELS = { en: 'English', de: 'Deutsch' }

const plural = (n, one, many) => (n === 1 ? one : many)

const STRINGS = {
  en: {
    'app.settings': 'Settings',
    'app.new': (singular) => `New ${singular}`,
    'app.id': 'ID',

    'gate.title': (title) => `${title} is encrypted`,
    'gate.body':
      'The data in this file is protected with AES-256-GCM. Without the passphrase there is no ' +
      'way in — not for anyone.',
    'gate.passphraseLabel': 'Passphrase',
    'gate.error': 'That passphrase does not match. The data stays encrypted.',
    'gate.decrypting': 'Decrypting…',
    'gate.unlock': 'Unlock',

    'filebar.tagline': 'application and data in a single file',
    'filebar.records': (n) => `${n} ${plural(n, 'record', 'records')}`,
    'filebar.dataBlock': (size) => `Data block ${size}`,
    'filebar.savedNever': 'never',
    'filebar.saved': (stamp) => `saved: ${stamp}`,
    'filebar.aiActive': 'AI integration active',
    'filebar.unsaved': 'unsaved',
    'filebar.encrypted': 'encrypted',
    'filebar.plain': 'plain text',
    'filebar.saving': 'writing…',

    'sidebar.overview': 'Overview',
    'sidebar.overdue': 'Overdue',
    'sidebar.openTotal': (label) => `Open ${label.toLowerCase()}`,
    'sidebar.all': 'All',
    'sidebar.exchange': 'Exchange',
    'sidebar.csv': 'CSV for Excel',
    'sidebar.exportJson': 'Export JSON',
    'sidebar.importJson': 'Import JSON',
    'sidebar.importCsv': 'Import CSV',

    'search.placeholder': 'Search titles, owners, notes…',
    'search.counter': (visible, total) => `${visible} of ${total}`,

    'empty.noMatches': 'No matches',
    'empty.noMatchesHint': 'Clear the filters or change the search term.',
    'empty.nothingYet': 'Nothing here yet',
    'empty.nothingYetHint': 'Create the first item or import a JSON file.',

    'drawer.new': (singular) => `New ${singular}`,
    'drawer.edit': (singular) => `Edit ${singular}`,
    'drawer.delete': 'Delete',
    'drawer.confirmDelete': 'Confirm delete',
    'drawer.ariaLabel': 'Edit record',
    'drawer.blockedByReferences': (refs) =>
      `Can't delete — still referenced by: ${refs}.`,
    'entities.tabsLabel': 'Entities',
    'view.list': 'List',
    'view.dashboard': 'Dashboard',
    'view.log': 'Change log',

    'log.title': 'Change log',
    'log.lead':
      'One entry per save. Kept inside the file, and inside the encrypted part of it when the file ' +
      'is encrypted.',
    'log.empty': 'No entry yet. The first one is written the next time you save.',
    'log.dialogTitle': 'Save',
    'log.whatChanged': 'What changed?',
    'log.notePlaceholder': 'e.g. three items closed after the steering committee',
    'log.versionLabel': 'Version',
    'log.versionPlaceholder': 'e.g. 1.4',
    'log.save': 'Save',
    'log.entryNote': 'Note',
    'log.entryVersion': 'Version',
    'log.noNote': 'no note',
    'log.deleteEntry': 'Delete entry',
    'log.entries': (n) => `${n} ${n === 1 ? 'entry' : 'entries'}`,

    'settings.auditLog': 'Change log',
    'settings.auditLogHint':
      'Writes one entry per save — date, time, version and your note. Switched off, nothing is ' +
      'recorded and saving asks nothing.',
    'settings.logging': 'recording',
    'settings.notLogging': 'off',

    'keyPrompt.title': 'An API key is needed',
    'keyPrompt.body': (model) =>
      `AI integration is switched on in this file${model ? ` (${model})` : ''}, but the key was ` +
      'deliberately not stored. Enter it for this session, or switch the integration off — then ' +
      'the app runs without any network connection again.',
    'keyPrompt.label': 'API key',
    'keyPrompt.disable': 'Switch AI integration off',

    'strength.weak':
      'Short or simple passphrase. It protects against casual reading, not against systematic ' +
      'guessing. In an already secured environment that can be a fair trade.',
    'strength.ok': 'Usable. Length helps more than special characters.',
    'strength.good': 'Solid passphrase.',

    'keyDialog.unavailableTitle': 'Encryption unavailable',
    'keyDialog.unavailableBody':
      'This browser does not expose the Web Crypto API in this context. Open the file in a ' +
      'current Chrome or Edge.',
    'keyDialog.changeTitle': 'Change passphrase',
    'keyDialog.encryptTitle': 'Encrypt this file',
    'keyDialog.body':
      'AES-256-GCM with a key derived through PBKDF2 (310,000 rounds). Without the passphrase the ' +
      'data cannot be recovered — there is no back door.',
    'keyDialog.passphraseLabel': 'Passphrase',
    'keyDialog.repeatLabel': 'Repeat',
    'keyDialog.errorEmpty': 'Please enter a passphrase.',
    'keyDialog.errorMismatch': 'The two entries do not match.',
    'keyDialog.remove': 'Remove encryption',
    'keyDialog.ariaLabel': 'Encryption',

    'toast.savedHandle': 'Written back to the selected file.',
    'toast.savedAs': (name) => `Saved as ${name}.`,
    'toast.saveError': (msg) => `Could not save: ${msg}`,
    'toast.changesApplied': (n) =>
      n === 1 ? '1 change applied — not saved yet.' : `${n} changes applied — not saved yet.`,
    'toast.noProposal': 'No proposal could be applied.',
    'toast.configApplied': (note) => `Configuration applied with limitations: ${note}`,
    'toast.configAppliedPlain': 'Configuration applied — not saved yet.',
    'toast.importCancelled': (msg) => `Import cancelled: ${msg}`,
    'toast.recordsImported': (n) => `${n} ${plural(n, 'record', 'records')} imported.`,
    'toast.encryptionRemoved': 'Encryption removed — the next save writes plain text.',
    'toast.aiDisabled': 'AI integration switched off. The app is fully local again.',
    'toast.passphraseSet': 'Passphrase set — save now.',
    'toast.encryptionRemovedShort': 'Encryption removed.',

    'common.apply': 'Apply',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.remove': 'Remove',
    'common.reset': 'Reset',
    'common.later': 'Later',
    'common.load': 'Load',
    'common.test': 'Test',
    'common.gotIt': 'Got it',
    'common.close': 'Close',

    'import.title': 'Import CSV',
    'import.summary': (name, rows, delimiter) =>
      `${name} · ${rows} data ${rows === 1 ? 'row' : 'rows'} · separator "${delimiter === '\t' ? 'Tab' : delimiter}"`,
    'import.lead':
      'Assign the columns of the file to the fields of this tool. Unassigned columns are left out. ' +
      'Identifiers are always assigned by the application, never taken from the file.',
    'import.columnHead': 'Column in the file',
    'import.fieldHead': 'Target field',
    'import.ignore': '— leave out —',
    'import.mode': 'Existing records',
    'import.append': 'keep, append',
    'import.replace': 'replace all',
    'import.run': 'Import',
    'import.row': (n) => `Line ${n}`,
    'import.needsTitle': (where, titleField) => `${where}: no ${titleField}, line skipped.`,
    'import.nothingMapped': 'No column is assigned to a field.',
    'import.empty': 'The file contains no data rows.',
    'import.resultTitle': 'Import result',
    'import.done': (n) => `${n} ${n === 1 ? 'record' : 'records'} imported — not saved yet.`,
    'import.noneValid': 'No line could be imported.',
    'import.problemCount': (n) => `${n} ${n === 1 ? 'objection' : 'objections'}:`,

    'contextMode.sichtbar': 'View',
    'contextMode.alle': 'All',
    'contextMode.kennzahlen': 'Aggregates',

    'dialect.notNegotiated': 'not negotiated yet',
    'dialect.withTemperature': 'with temperature',
    'dialect.withoutTemperature': 'without temperature',
    'dialect.systemRoleAs': (role) => `system role as ${role}`,
    'dialect.v1Appended': '/v1 appended',
    'dialect.without': (names) => `without ${names}`,

    'chat.title': 'AI assistant',
    'chat.noModel': 'no model',
    'chat.contextLabel': (mode) => `Context: ${mode}`,
    'chat.attachments': (n) => `${n} attachment${n === 1 ? '' : 's'}`,
    'chat.writeAllowed': 'changes allowed',
    'chat.readOnly': 'read only',
    'chat.hintWrite':
      'The records in this file go to the configured endpoint with every question. Text ' +
      'files can be attached and are added as extra context. On an explicit instruction the ' +
      'model proposes changes, which you see before they are applied.',
    'chat.hintReadOnly':
      'The records in this file go to the configured endpoint with every question. Text ' +
      'files can be attached and are added as extra context. Write access is switched off in ' +
      'the settings.',
    'chat.you': 'You',
    'chat.model': 'Model',
    'chat.thinking': 'thinking …',
    'chat.proposalHead': (n) => `Proposed change${n > 1 ? 's' : ''} to the data`,
    'chat.discard': 'Discard',
    'chat.discarded': 'Proposal discarded.',
    'chat.placeholder': 'Ask about or instruct changes to the data in this file …',
    'chat.files': 'Files',
    'chat.send': 'Send',
    'chat.clearHistory': 'Clear history',
    'chat.skipped': (names) => `Skipped, no readable text: ${names}.`,
    'chat.removeAll': 'remove all',
    'chat.removeAttachment': (name) => `Remove ${name}`,

    'actions.notField': (where, key) => `${where}: no such field "${key}", ignored.`,
    'actions.readOnly': (where, label) =>
      `${where}: ${label} is calculated from the other fields and cannot be set.`,
    'actions.notEnum': (where, raw, label, values) =>
      `${where}: "${raw}" is not a valid ${label}. Allowed: ${values}.`,
    'actions.notNumber': (where, raw, label) => `${where}: "${raw}" is not a number for ${label}.`,
    'actions.notDate': (where, raw) => `${where}: "${raw}" is not a date in YYYY-MM-DD format.`,
    'actions.notReference': (where, raw, label) =>
      `${where}: "${raw}" does not match any existing ${label}.`,
    'actions.unknownEntity': (where, entity, known) =>
      `${where}: "${entity}" is not a known entity. Allowed: ${known}.`,
    'actions.unknownOp': (where, op) => `${where}: "${op}" is not a known operation.`,
    'actions.created': (title, id) => `Created: ${title} (${id})`,
    'actions.needsTitle': (where, titleField) => `${where}: nothing is created without a ${titleField}.`,
    'actions.notFound': (where, id) => `${where}: ${id ? `"${id}"` : 'no id given'} — not found in the data.`,
    'actions.deleted': (title, id) => `Deleted: ${title} (${id})`,
    'actions.updated': (id, changes) => `Updated ${id} — ${changes}`,
    'actions.nothingToChange': (where, id) => `${where}: nothing to change on ${id}.`,
    'actions.action': (n) => `Action ${n}`,
    'actions.describeCreate': (title) => `Create: ${title}`,
    'actions.describeDelete': (title, id) => `Delete: ${title} (${id})`,
    'actions.describeUpdate': (id, known, parts) => `Update ${id}${known ? ` (${known})` : ''}: ${parts}`,
    'actions.describeUnknown': (n) => `Unknown action ${n}`,
    'actions.noTitle': '(no title)',
    'actions.unknown': '(unknown)',

    'settings.back': 'Back to the list',
    'settings.title': 'Settings',
    'settings.lead':
      'Everything here is written into the file when you save and travels with it. Whoever ' +
      'receives the file receives these settings too.',
    'settings.appearance': 'Appearance',
    'settings.colorScheme': 'Color scheme',
    'settings.colorSchemeHint': 'Stored with the file and applied the next time it is opened.',
    'settings.system': 'System',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'settings.rowHeight': 'Row height',
    'settings.rowHeightHint': 'Compact fits roughly a third more rows on long lists.',
    'settings.normal': 'Normal',
    'settings.compact': 'Compact',
    'settings.watermark': 'Watermark',
    'settings.watermarkHint': 'Semi-transparent mark in the bottom right corner.',
    'settings.visible': 'visible',
    'settings.hidden': 'hidden',
    'settings.language': 'Language',
    'settings.languageHint': 'Only the interface changes. Field names and data stay as written.',
    'settings.colors': 'Colors',
    'settings.accent': 'Accent',
    'settings.accentHint':
      'Carries everything active: primary buttons, filters, links. The lighter and darker ' +
      'shades are derived from it.',
    'settings.headerBar': 'Header bar',
    'settings.headerBarHint': (contrast) =>
      `Top bar, table head, side panel. Contrast against white text: ${contrast}:1 — below 4.5 it gets hard to read.`,
    'settings.attention': 'Attention',
    'settings.attentionHint': 'Overdue items and the waiting state.',
    'settings.done': 'Done',
    'settings.doneHint': 'Completed items.',
    'settings.unsavedLabel': 'Unsaved',
    'settings.unsavedHint': 'The dot in the file bar while changes are pending.',
    'settings.backToDefaults': 'Back to defaults',
    'settings.backToDefaultsHint': 'Restores the shipped palette.',
    'settings.resetColors': 'Reset colors',
    'settings.branding': 'Branding',
    'settings.productName': 'Product name',
    'settings.productNameHint': 'Shown in the header, on the lock screen and as the watermark when no logo is set.',
    'settings.logo': 'Logo',
    'settings.logoHint':
      'An SVG file. It is embedded into the HTML, so it travels with the file. Scripts, event ' +
      'handlers and external references are stripped before it is used.',
    'settings.uploadSvg': 'Upload SVG',
    'settings.replaceSvg': 'Replace SVG',
    'settings.preview': 'Preview',
    'settings.previewHint': 'Rendered the way it appears in the header.',
    'settings.application': 'Application',
    'settings.appTitle': 'Title',
    'settings.appTitleHint': 'Shown in the header and on the lock screen.',
    'settings.subtitle': 'Subtitle',
    'settings.fileName': 'File name',
    'settings.fileNameHint': 'Without extension. Drives the save suggestion and the export files.',
    'settings.version': 'Version',
    'settings.versionHint':
      'Free text — "1.4", "2026-Q3", "final for steering committee". Shown next to the title and ' +
      'folded into the saved file name. Leave empty and nothing is shown.',
    'settings.versionEmpty': 'no version',

    'settings.examplePrompts': 'Example prompts',
    'settings.examplePromptsHint':
      'Shows hint boxes at the places you would typically want to change, each with a prompt you ' +
      'can hand to an AI agent working on this tool. Switch off before passing the file to someone ' +
      'who only uses it.',
    'settings.promptsShown': 'shown',
    'settings.promptsHidden': 'hidden',

    'hint.label': 'Example prompt',
    'hint.copy': 'Copy',
    'hint.copied': 'Copied',
    'hint.header':
      'Title, subtitle, logo and the five colours all live in the settings and travel with the file.',
    'hint.header.prompt':
      'Rename this tool to "Supplier audits", give it the subtitle "Findings from the 2026 audit round", and set the accent colour to a dark blue.',
    'hint.columns':
      'Which columns you see, in which order, and which fields exist at all comes from SCHEMA in src/domain.js.',
    'hint.columns.prompt':
      'Add a "Priority" field with the values high, medium and low, show it as a column after the owner, and make it filterable in the sidebar.',
    'hint.filters':
      'The overview figures and the filter groups are generated from the schema — facets, totalField and the isDone/isOverdue rules.',
    'hint.filters.prompt':
      'Count only items that are not done in the overview, and add a filter group for the responsible person.',
    'hint.dashboard':
      'Every tile is one entry in the DASHBOARD export — stat, bar or donut, optionally filtered.',
    'hint.dashboard.prompt':
      'Add a dashboard tile showing effort per owner as a bar chart, and one counting only the items due within the next 14 days.',
    'hint.form':
      'The form is generated from the fields — including a calculated field that is derived rather than typed in.',
    'hint.form.prompt':
      'Add a calculated field "Risk score" that multiplies likelihood by impact, and show it in the table.',
    'hint.import':
      'CSV import maps the columns of your file onto these fields; matching headings are preselected.',
    'hint.import.prompt':
      'Rename the fields so they match the column headings of my Excel export: Vorgang, Zuständig, Fällig, Status.',
    'hint.ai':
      'The assistant reads the records in this file and, on an explicit instruction, proposes changes you approve first.',
    'hint.ai.prompt':
      'Set up the AI assistant against our internal LiteLLM proxy, restrict it to read-only, and change its role text so it answers in German.',
    'hint.settings':
      'Everything on this page is stored in the file. Export the configuration once and reuse it for the next tool.',
    'hint.settings.prompt':
      'Build me a second tool with the same colours and logo, but for tracking vendor certificates.',
    'settings.security': 'Security',
    'settings.encryptedLabel': 'This file is encrypted',
    'settings.plainLabel': 'This file is plain text',
    'settings.encryptedHint':
      'AES-256-GCM with a key derived from your passphrase through PBKDF2. Without it there is no recovery.',
    'settings.plainHint': 'Anyone who opens the file sees the full data set.',
    'settings.changePassphrase': 'Change passphrase',
    'settings.encrypt': 'Encrypt',
    'settings.securityNote':
      'Encryption protects the data, not access to the application. Roles and views in a file ' +
      'that runs locally would be surface only — whoever holds the file also holds the code.',
    'settings.analytics': 'Usage counter',
    'settings.analyticsHint':
      'Reports one page view to the endpoint below when this file is opened, together with the ' +
      'kind of tool this is. No records, no field contents, no file name, nothing you typed. ' +
      'Switch it off and — with the AI integration off as well — this file opens no network ' +
      'connection at all.',
    'settings.counting': 'counting',
    'settings.notCounting': 'off',
    'settings.analyticsUrl': 'Counting endpoint',
    'settings.analyticsUrlHint':
      'Preset to the counter of whoever built this template. Point it at your own — any endpoint ' +
      'that accepts a GET works — or clear the field to count nothing. The setting travels with ' +
      'the file, so copies you pass on keep counting where you decided.',
    'settings.analyticsUrlEmpty': 'empty — count nothing',
    'settings.aiIntegration': 'AI integration',
    'settings.aiActiveLabel': 'AI integration active',
    'settings.aiActiveHint':
      'While this is off, nothing from this file is sent to a model — there is no second way out. ' +
      'With the usage counter above switched off too, the file opens no network connection at all.',
    'settings.on': 'on',
    'settings.off': 'off',
    'settings.aiWarnNote':
      'From now on every question sends the records in this file to the endpoint configured ' +
      'below. In regulated environments that is outsourcing — clear it with the responsible ' +
      'function before you use it.',
    'settings.endpoint': 'Endpoint',
    'settings.endpointHintSet': (url) => `Requests go to: ${url}`,
    'settings.endpointHintUnset': 'Base URL, usually up to and including /v1. Append an Azure api-version as a query string.',
    'settings.model': 'Model',
    'settings.modelHint': 'Name or deployment, exactly as the endpoint expects it.',
    'settings.authentication': 'Authentication',
    'settings.authenticationHint': 'Bearer for OpenAI, LiteLLM and most proxies. api-key for Azure AI Foundry.',
    'settings.extraHeaders': 'Extra headers',
    'settings.extraHeadersHint':
      'One per line as Name: Value, for gateways that expect their own headers. An api-version belongs in the URL query.',
    'settings.apiKey': 'API key',
    'settings.apiKeyHint': 'Takes effect immediately for this session. Whether it also lands in the file is decided below.',
    'settings.storeKey': 'Store the key',
    'settings.storeKeyHintStorePlain':
      'The key then sits in plain text inside a file that gets passed around. Only sensible if ' +
      'the file stays on this machine — otherwise encrypt first.',
    'settings.storeKeyHintSealed': 'The key goes into the encrypted part of the file and is unreadable without the passphrase.',
    'settings.storeKeyHintDefault': 'Without this, the file asks for the key once when it is opened. That is the safe default.',
    'settings.storedInFile': 'stored in file',
    'settings.sessionOnly': 'this session only',
    'settings.storeKeyWarn':
      'This file is not encrypted. Anyone who opens it can read the key in the source. Either ' +
      'set a passphrase above or clear this checkbox.',
    'settings.contextSent': 'Context sent along',
    'settings.contextSentHint': 'What travels with every question: the filtered view, all records, or only the aggregates without individual cases.',
    'settings.changesToData': 'Changes to the data',
    'settings.changesToDataHint': 'On an explicit instruction the model may create, update and delete records. Every proposal is validated and shown first.',
    'settings.allowed': 'allowed',
    'settings.readOnly': 'read only',
    'settings.applyWithoutAsking': 'Apply without asking',
    'settings.applyWithoutAskingHint':
      'Off means you see every proposal as a list and decide. That is the default and the only ' +
      'sensible setting where changes have to be justified.',
    'settings.applyImmediately': 'apply immediately',
    'settings.showFirst': 'show first',
    'settings.roleOfModel': 'Role of the model',
    'settings.roleOfModelHint': 'System instruction sent before every question.',
    'settings.temperatureLength': 'Temperature and length',
    'settings.temperatureLengthHint': 'Temperature 0 to 2, answer length in tokens.',
    'settings.testConnection': 'Test the connection',
    'settings.testConnectionHint': 'A minimal call to the endpoint, without any data from the file.',
    'settings.testing': 'testing …',
    'settings.negotiatedDialect': 'Negotiated dialect',
    'settings.negotiatedDialectHint': 'Worked out on the first successful call and stored with the file. Reset it after switching models.',
    'settings.data': 'Data',
    'settings.exportHint': 'Export writes separate files; the application itself is untouched.',
    'settings.csv': 'CSV',
    'settings.json': 'JSON',
    'settings.configuration': 'Configuration',
    'settings.saveTransfer': 'Save or transfer these settings',
    'settings.saveTransferHint':
      'Everything on this page as JSON — without records and without the API key. Meant for ' +
      'carrying a working setup over to other tools.',
    'settings.configNote':
      'Loading only takes what is defined here; anything else is dropped and named in the ' +
      'notice. If the loaded configuration has AI switched on, the application asks for the key afterwards.',
    'settings.copyrightPre': (year) => `© ${year} `,
    'settings.copyrightPost': ' · openToolbox · Apache License 2.0',
    'settings.runsLocally': 'Single-file application. Runs locally, without a server and without installation.',
    'settings.probeReachable': (answer) => `Endpoint reachable. Reply: ${answer}`,
    'settings.logoApplied': 'Logo applied.',
    'settings.logoAppliedRemoved': (removed) => `Logo applied. Removed for safety: ${removed}.`,
  },

  de: {
    'app.settings': 'Einstellungen',
    'app.new': (singular) => `Neu: ${singular}`,
    'app.id': 'ID',

    'gate.title': (title) => `${title} ist verschlüsselt`,
    'gate.body':
      'Die Daten in dieser Datei sind mit AES-256-GCM geschützt. Ohne die Passphrase kommt niemand ' +
      'hinein — auch nicht mit Zugriff auf die Datei.',
    'gate.passphraseLabel': 'Passphrase',
    'gate.error': 'Die Passphrase stimmt nicht. Die Daten bleiben verschlüsselt.',
    'gate.decrypting': 'Entschlüsseln…',
    'gate.unlock': 'Entsperren',

    'filebar.tagline': 'Anwendung und Daten in einer einzigen Datei',
    'filebar.records': (n) => `${n} ${plural(n, 'Datensatz', 'Datensätze')}`,
    'filebar.dataBlock': (size) => `Datenblock ${size}`,
    'filebar.savedNever': 'nie',
    'filebar.saved': (stamp) => `gespeichert: ${stamp}`,
    'filebar.aiActive': 'KI-Integration aktiv',
    'filebar.unsaved': 'ungesichert',
    'filebar.encrypted': 'verschlüsselt',
    'filebar.plain': 'Klartext',
    'filebar.saving': 'speichert…',

    'sidebar.overview': 'Übersicht',
    'sidebar.overdue': 'Überfällig',
    'sidebar.openTotal': (label) => `Offen: ${label}`,
    'sidebar.all': 'Alle',
    'sidebar.exchange': 'Austausch',
    'sidebar.csv': 'CSV für Excel',
    'sidebar.exportJson': 'JSON exportieren',
    'sidebar.importJson': 'JSON importieren',
    'sidebar.importCsv': 'CSV importieren',

    'search.placeholder': 'Titel, Verantwortliche, Notizen durchsuchen…',
    'search.counter': (visible, total) => `${visible} von ${total}`,

    'empty.noMatches': 'Keine Treffer',
    'empty.noMatchesHint': 'Filter zurücksetzen oder Suchbegriff ändern.',
    'empty.nothingYet': 'Noch nichts hier',
    'empty.nothingYetHint': 'Ersten Eintrag anlegen oder eine JSON-Datei importieren.',

    'drawer.new': (singular) => `Neu: ${singular}`,
    'drawer.edit': (singular) => `Bearbeiten: ${singular}`,
    'drawer.delete': 'Löschen',
    'drawer.confirmDelete': 'Löschen bestätigen',
    'drawer.ariaLabel': 'Datensatz bearbeiten',
    'drawer.blockedByReferences': (refs) =>
      `Löschen nicht möglich — wird noch referenziert von: ${refs}.`,
    'entities.tabsLabel': 'Entitäten',
    'view.list': 'Liste',
    'view.dashboard': 'Dashboard',
    'view.log': 'Änderungsprotokoll',

    'log.title': 'Änderungsprotokoll',
    'log.lead':
      'Ein Eintrag je Speichervorgang. Bleibt in der Datei, und bei verschlüsselter Datei im ' +
      'verschlüsselten Teil davon.',
    'log.empty': 'Noch kein Eintrag. Der erste entsteht beim nächsten Speichern.',
    'log.dialogTitle': 'Speichern',
    'log.whatChanged': 'Was hat sich geändert?',
    'log.notePlaceholder': 'z. B. drei Punkte nach dem Lenkungsausschuss geschlossen',
    'log.versionLabel': 'Version',
    'log.versionPlaceholder': 'z. B. 1.4',
    'log.save': 'Speichern',
    'log.entryNote': 'Notiz',
    'log.entryVersion': 'Version',
    'log.noNote': 'ohne Notiz',
    'log.deleteEntry': 'Eintrag löschen',
    'log.entries': (n) => `${n} ${n === 1 ? 'Eintrag' : 'Einträge'}`,

    'settings.auditLog': 'Änderungsprotokoll',
    'settings.auditLogHint':
      'Schreibt bei jedem Speichern einen Eintrag — Datum, Uhrzeit, Version und deine Notiz. ' +
      'Ausgeschaltet wird nichts festgehalten und das Speichern fragt nichts.',
    'settings.logging': 'zeichnet auf',
    'settings.notLogging': 'aus',

    'keyPrompt.title': 'Ein API-Schlüssel wird benötigt',
    'keyPrompt.body': (model) =>
      `Die KI-Integration ist in dieser Datei eingeschaltet${model ? ` (${model})` : ''}, der ` +
      'Schlüssel wurde aber bewusst nicht gespeichert. Trage ihn für diese Sitzung ein, oder ' +
      'schalte die Integration aus — dann läuft die Anwendung wieder ganz ohne Netzwerkzugriff.',
    'keyPrompt.label': 'API-Schlüssel',
    'keyPrompt.disable': 'KI-Integration ausschalten',

    'strength.weak':
      'Kurze oder einfache Passphrase. Schützt vor zufälligem Mitlesen, nicht vor gezieltem ' +
      'Raten. In einer ohnehin abgesicherten Umgebung kann das ein vertretbarer Kompromiss sein.',
    'strength.ok': 'Brauchbar. Länge hilft mehr als Sonderzeichen.',
    'strength.good': 'Solide Passphrase.',

    'keyDialog.unavailableTitle': 'Verschlüsselung nicht verfügbar',
    'keyDialog.unavailableBody':
      'Dieser Browser stellt die Web-Crypto-API in diesem Kontext nicht bereit. Datei in einem ' +
      'aktuellen Chrome oder Edge öffnen.',
    'keyDialog.changeTitle': 'Passphrase ändern',
    'keyDialog.encryptTitle': 'Diese Datei verschlüsseln',
    'keyDialog.body':
      'AES-256-GCM mit einem über PBKDF2 abgeleiteten Schlüssel (310.000 Runden). Ohne die ' +
      'Passphrase sind die Daten nicht wiederherstellbar — es gibt keine Hintertür.',
    'keyDialog.passphraseLabel': 'Passphrase',
    'keyDialog.repeatLabel': 'Wiederholen',
    'keyDialog.errorEmpty': 'Bitte eine Passphrase eingeben.',
    'keyDialog.errorMismatch': 'Die beiden Eingaben stimmen nicht überein.',
    'keyDialog.remove': 'Verschlüsselung entfernen',
    'keyDialog.ariaLabel': 'Verschlüsselung',

    'toast.savedHandle': 'In die gewählte Datei zurückgeschrieben.',
    'toast.savedAs': (name) => `Gespeichert als ${name}.`,
    'toast.saveError': (msg) => `Speichern fehlgeschlagen: ${msg}`,
    'toast.changesApplied': (n) =>
      n === 1 ? '1 Änderung angewandt — noch nicht gespeichert.' : `${n} Änderungen angewandt — noch nicht gespeichert.`,
    'toast.noProposal': 'Kein Vorschlag konnte angewandt werden.',
    'toast.configApplied': (note) => `Konfiguration angewandt, mit Einschränkung: ${note}`,
    'toast.configAppliedPlain': 'Konfiguration angewandt — noch nicht gespeichert.',
    'toast.importCancelled': (msg) => `Import abgebrochen: ${msg}`,
    'toast.recordsImported': (n) => `${n} ${plural(n, 'Datensatz', 'Datensätze')} importiert.`,
    'toast.encryptionRemoved': 'Verschlüsselung entfernt — nächstes Speichern schreibt Klartext.',
    'toast.aiDisabled': 'KI-Integration ausgeschaltet. Die Anwendung ist wieder vollständig lokal.',
    'toast.passphraseSet': 'Passphrase gesetzt — jetzt speichern.',
    'toast.encryptionRemovedShort': 'Verschlüsselung entfernt.',

    'common.apply': 'Anwenden',
    'common.cancel': 'Abbrechen',
    'common.save': 'Speichern',
    'common.remove': 'Entfernen',
    'common.reset': 'Zurücksetzen',
    'common.later': 'Später',
    'common.load': 'Laden',
    'common.test': 'Testen',
    'common.gotIt': 'Verstanden',
    'common.close': 'Schließen',

    'import.title': 'CSV importieren',
    'import.summary': (name, rows, delimiter) =>
      `${name} · ${rows} ${rows === 1 ? 'Datenzeile' : 'Datenzeilen'} · Trennzeichen "${delimiter === '\t' ? 'Tab' : delimiter}"`,
    'import.lead':
      'Ordne die Spalten der Datei den Feldern dieses Werkzeugs zu. Nicht zugeordnete Spalten ' +
      'bleiben außen vor. Kennungen vergibt immer die Anwendung, nie die Datei.',
    'import.columnHead': 'Spalte in der Datei',
    'import.fieldHead': 'Zielfeld',
    'import.ignore': '— weglassen —',
    'import.mode': 'Vorhandene Datensätze',
    'import.append': 'behalten, anhängen',
    'import.replace': 'alle ersetzen',
    'import.run': 'Importieren',
    'import.row': (n) => `Zeile ${n}`,
    'import.needsTitle': (where, titleField) => `${where}: kein ${titleField}, Zeile übersprungen.`,
    'import.nothingMapped': 'Keine Spalte ist einem Feld zugeordnet.',
    'import.empty': 'Die Datei enthält keine Datenzeilen.',
    'import.resultTitle': 'Ergebnis des Imports',
    'import.done': (n) => `${n} ${n === 1 ? 'Datensatz' : 'Datensätze'} importiert — noch nicht gespeichert.`,
    'import.noneValid': 'Keine Zeile konnte importiert werden.',
    'import.problemCount': (n) => `${n} ${n === 1 ? 'Beanstandung' : 'Beanstandungen'}:`,

    'contextMode.sichtbar': 'Ansicht',
    'contextMode.alle': 'Alle',
    'contextMode.kennzahlen': 'Kennzahlen',

    'dialect.notNegotiated': 'noch nicht ausgehandelt',
    'dialect.withTemperature': 'mit Temperatur',
    'dialect.withoutTemperature': 'ohne Temperatur',
    'dialect.systemRoleAs': (role) => `Systemrolle als ${role}`,
    'dialect.v1Appended': '/v1 angehängt',
    'dialect.without': (names) => `ohne ${names}`,

    'chat.title': 'KI-Assistent',
    'chat.noModel': 'kein Modell',
    'chat.contextLabel': (mode) => `Kontext: ${mode}`,
    'chat.attachments': (n) => (n === 1 ? '1 Anhang' : `${n} Anhänge`),
    'chat.writeAllowed': 'Änderungen erlaubt',
    'chat.readOnly': 'nur lesend',
    'chat.hintWrite':
      'Die Datensätze in dieser Datei gehen bei jeder Frage an den konfigurierten Endpunkt. ' +
      'Textdateien können angehängt werden und ergänzen den Kontext. Auf ausdrückliche Anweisung ' +
      'schlägt das Modell Änderungen vor, die vor der Anwendung angezeigt werden.',
    'chat.hintReadOnly':
      'Die Datensätze in dieser Datei gehen bei jeder Frage an den konfigurierten Endpunkt. ' +
      'Textdateien können angehängt werden und ergänzen den Kontext. Schreibzugriff ist in den ' +
      'Einstellungen ausgeschaltet.',
    'chat.you': 'Du',
    'chat.model': 'Modell',
    'chat.thinking': 'denkt nach …',
    'chat.proposalHead': (n) => `Vorgeschlagene Änderung${n > 1 ? 'en' : ''} an den Daten`,
    'chat.discard': 'Verwerfen',
    'chat.discarded': 'Vorschlag verworfen.',
    'chat.placeholder': 'Frage stellen oder Änderungen an den Daten in dieser Datei anweisen …',
    'chat.files': 'Dateien',
    'chat.send': 'Senden',
    'chat.clearHistory': 'Verlauf löschen',
    'chat.skipped': (names) => `Übersprungen, kein lesbarer Text: ${names}.`,
    'chat.removeAll': 'alle entfernen',
    'chat.removeAttachment': (name) => `${name} entfernen`,

    'actions.notField': (where, key) => `${where}: Feld "${key}" gibt es nicht, ignoriert.`,
    'actions.readOnly': (where, label) =>
      `${where}: ${label} wird aus den anderen Feldern berechnet und lässt sich nicht setzen.`,
    'actions.notEnum': (where, raw, label, values) =>
      `${where}: "${raw}" ist kein gültiger Wert für ${label}. Erlaubt: ${values}.`,
    'actions.notNumber': (where, raw, label) => `${where}: "${raw}" ist keine Zahl für ${label}.`,
    'actions.notDate': (where, raw) => `${where}: "${raw}" ist kein Datum im Format JJJJ-MM-TT.`,
    'actions.notReference': (where, raw, label) =>
      `${where}: "${raw}" passt zu keinem vorhandenen ${label}.`,
    'actions.unknownEntity': (where, entity, known) =>
      `${where}: "${entity}" ist keine bekannte Entität. Erlaubt: ${known}.`,
    'actions.unknownOp': (where, op) => `${where}: "${op}" ist keine bekannte Operation.`,
    'actions.created': (title, id) => `Angelegt: ${title} (${id})`,
    'actions.needsTitle': (where, titleField) => `${where}: ohne ${titleField} wird nichts angelegt.`,
    'actions.notFound': (where, id) => `${where}: ${id ? `"${id}"` : 'keine Id angegeben'} — nicht in den Daten gefunden.`,
    'actions.deleted': (title, id) => `Gelöscht: ${title} (${id})`,
    'actions.updated': (id, changes) => `${id} aktualisiert — ${changes}`,
    'actions.nothingToChange': (where, id) => `${where}: nichts zu ändern an ${id}.`,
    'actions.action': (n) => `Aktion ${n}`,
    'actions.describeCreate': (title) => `Anlegen: ${title}`,
    'actions.describeDelete': (title, id) => `Löschen: ${title} (${id})`,
    'actions.describeUpdate': (id, known, parts) => `${id} aktualisieren${known ? ` (${known})` : ''}: ${parts}`,
    'actions.describeUnknown': (n) => `Unbekannte Aktion ${n}`,
    'actions.noTitle': '(kein Titel)',
    'actions.unknown': '(unbekannt)',

    'settings.back': 'Zurück zur Liste',
    'settings.title': 'Einstellungen',
    'settings.lead':
      'Alles hier wird beim Speichern in die Datei geschrieben und reist mit ihr mit. Wer die ' +
      'Datei erhält, erhält auch diese Einstellungen.',
    'settings.appearance': 'Erscheinungsbild',
    'settings.colorScheme': 'Farbschema',
    'settings.colorSchemeHint': 'Wird mit der Datei gespeichert und beim nächsten Öffnen angewandt.',
    'settings.system': 'System',
    'settings.light': 'Hell',
    'settings.dark': 'Dunkel',
    'settings.rowHeight': 'Zeilenhöhe',
    'settings.rowHeightHint': 'Kompakt passt rund ein Drittel mehr Zeilen auf lange Listen.',
    'settings.normal': 'Normal',
    'settings.compact': 'Kompakt',
    'settings.watermark': 'Wasserzeichen',
    'settings.watermarkHint': 'Halbtransparente Markierung unten rechts.',
    'settings.visible': 'sichtbar',
    'settings.hidden': 'ausgeblendet',
    'settings.language': 'Sprache',
    'settings.languageHint': 'Nur die Oberfläche ändert sich. Feldnamen und Daten bleiben, wie sie angelegt wurden.',
    'settings.colors': 'Farben',
    'settings.accent': 'Akzent',
    'settings.accentHint':
      'Trägt alles Aktive: primäre Buttons, Filter, Links. Die helleren und dunkleren Abstufungen ' +
      'werden daraus abgeleitet.',
    'settings.headerBar': 'Kopfleiste',
    'settings.headerBarHint': (contrast) =>
      `Kopfleiste, Tabellenkopf, Seitenleiste. Kontrast gegen weiße Schrift: ${contrast}:1 — unter 4,5 wird es schwer lesbar.`,
    'settings.attention': 'Achtung',
    'settings.attentionHint': 'Überfällige Einträge und der Warte-Status.',
    'settings.done': 'Erledigt',
    'settings.doneHint': 'Abgeschlossene Einträge.',
    'settings.unsavedLabel': 'Ungesichert',
    'settings.unsavedHint': 'Der Punkt in der Dateileiste bei ausstehenden Änderungen.',
    'settings.backToDefaults': 'Auf Standard zurücksetzen',
    'settings.backToDefaultsHint': 'Stellt die mitgelieferte Palette wieder her.',
    'settings.resetColors': 'Farben zurücksetzen',
    'settings.branding': 'Markenbild',
    'settings.productName': 'Produktname',
    'settings.productNameHint': 'Erscheint im Kopfbereich, auf dem Sperrbildschirm und als Wasserzeichen, wenn kein Logo gesetzt ist.',
    'settings.logo': 'Logo',
    'settings.logoHint':
      'Eine SVG-Datei. Sie wird in das HTML eingebettet und reist so mit der Datei mit. Skripte, ' +
      'Event-Handler und externe Referenzen werden vor der Nutzung entfernt.',
    'settings.uploadSvg': 'SVG hochladen',
    'settings.replaceSvg': 'SVG ersetzen',
    'settings.preview': 'Vorschau',
    'settings.previewHint': 'So dargestellt, wie es im Kopfbereich erscheint.',
    'settings.application': 'Anwendung',
    'settings.appTitle': 'Titel',
    'settings.appTitleHint': 'Erscheint im Kopfbereich und auf dem Sperrbildschirm.',
    'settings.subtitle': 'Untertitel',
    'settings.fileName': 'Dateiname',
    'settings.fileNameHint': 'Ohne Endung. Bestimmt den Speichervorschlag und die Exportdateien.',
    'settings.version': 'Version',
    'settings.versionHint':
      'Freier Text — "1.4", "2026-Q3", "final für Lenkungsausschuss". Erscheint neben dem Titel und ' +
      'wandert in den Dateinamen beim Speichern. Leer lassen, dann wird nichts angezeigt.',
    'settings.versionEmpty': 'keine Version',

    'settings.examplePrompts': 'Beispiel-Prompts',
    'settings.examplePromptsHint':
      'Blendet an den Stellen, die man typischerweise ändern will, Hinweiskästen ein — jeweils mit ' +
      'einem Prompt, den du einem KI-Agenten geben kannst, der an diesem Werkzeug arbeitet. Vor der ' +
      'Weitergabe an reine Anwender ausschalten.',
    'settings.promptsShown': 'sichtbar',
    'settings.promptsHidden': 'aus',

    'hint.label': 'Beispiel-Prompt',
    'hint.copy': 'Kopieren',
    'hint.copied': 'Kopiert',
    'hint.header':
      'Titel, Untertitel, Logo und die fünf Farben stehen in den Einstellungen und reisen mit der Datei.',
    'hint.header.prompt':
      'Benenne dieses Werkzeug in "Lieferantenaudits" um, gib ihm den Untertitel "Feststellungen aus der Auditrunde 2026" und setze die Akzentfarbe auf ein dunkles Blau.',
    'hint.columns':
      'Welche Spalten du siehst, in welcher Reihenfolge, und welche Felder es überhaupt gibt, kommt aus SCHEMA in src/domain.js.',
    'hint.columns.prompt':
      'Ergänze ein Feld "Priorität" mit den Werten hoch, mittel und niedrig, zeige es als Spalte hinter dem Verantwortlichen und mache es in der Seitenleiste filterbar.',
    'hint.filters':
      'Die Kennzahlen und die Filtergruppen entstehen aus dem Schema — facets, totalField und die Regeln isDone/isOverdue.',
    'hint.filters.prompt':
      'Zähle in der Übersicht nur die noch nicht erledigten Einträge und ergänze eine Filtergruppe nach Verantwortlichem.',
    'hint.dashboard':
      'Jede Kachel ist ein Eintrag im DASHBOARD-Export — stat, bar oder donut, wahlweise gefiltert.',
    'hint.dashboard.prompt':
      'Ergänze eine Dashboard-Kachel mit dem Aufwand je Verantwortlichem als Balken, und eine, die nur die in den nächsten 14 Tagen fälligen Einträge zählt.',
    'hint.form':
      'Das Formular entsteht aus den Feldern — einschließlich berechneter Felder, die abgeleitet statt eingetippt werden.',
    'hint.form.prompt':
      'Ergänze ein berechnetes Feld "Risikowert", das Wahrscheinlichkeit mal Auswirkung rechnet, und zeige es in der Tabelle.',
    'hint.import':
      'Der CSV-Import ordnet die Spalten deiner Datei diesen Feldern zu; passende Überschriften sind vorbelegt.',
    'hint.import.prompt':
      'Benenne die Felder so um, dass sie zu den Spaltenüberschriften meines Excel-Exports passen: Vorgang, Zuständig, Fällig, Status.',
    'hint.ai':
      'Der Assistent liest die Datensätze dieser Datei und schlägt auf ausdrückliche Anweisung Änderungen vor, die du vorher freigibst.',
    'hint.ai.prompt':
      'Richte den KI-Assistenten gegen unseren internen LiteLLM-Proxy ein, beschränke ihn auf lesenden Zugriff und ändere seinen Rollentext so, dass er auf Deutsch antwortet.',
    'hint.settings':
      'Alles auf dieser Seite steht in der Datei. Exportiere die Konfiguration einmal und nutze sie für das nächste Werkzeug wieder.',
    'hint.settings.prompt':
      'Bau mir ein zweites Werkzeug mit denselben Farben und demselben Logo, aber für die Verfolgung von Lieferantenzertifikaten.',
    'settings.security': 'Sicherheit',
    'settings.encryptedLabel': 'Diese Datei ist verschlüsselt',
    'settings.plainLabel': 'Diese Datei ist Klartext',
    'settings.encryptedHint':
      'AES-256-GCM mit einem aus der Passphrase über PBKDF2 abgeleiteten Schlüssel. Ohne sie gibt es keine Wiederherstellung.',
    'settings.plainHint': 'Wer die Datei öffnet, sieht den vollständigen Datenbestand.',
    'settings.changePassphrase': 'Passphrase ändern',
    'settings.encrypt': 'Verschlüsseln',
    'settings.securityNote':
      'Verschlüsselung schützt die Daten, nicht den Zugriff auf die Anwendung. Rollen und Ansichten ' +
      'in einer lokal laufenden Datei wären nur Oberfläche — wer die Datei hat, hat auch den Code.',
    'settings.analytics': 'Aufrufzähler',
    'settings.analyticsHint':
      'Meldet beim Öffnen dieser Datei einen Seitenaufruf an den unten eingetragenen Endpunkt, ' +
      'zusammen mit der Art des Werkzeugs. Keine Datensätze, keine Feldinhalte, kein Dateiname, ' +
      'nichts von dir Eingegebenes. Ausgeschaltet öffnet diese Datei — bei ebenfalls ' +
      'ausgeschalteter KI-Anbindung — überhaupt keine Netzwerkverbindung.',
    'settings.counting': 'zählt',
    'settings.notCounting': 'aus',
    'settings.analyticsUrl': 'Zähl-Endpunkt',
    'settings.analyticsUrlHint':
      'Vorbelegt mit dem Zähler dessen, der diese Vorlage gebaut hat. Trag deinen eigenen ein — es ' +
      'genügt ein Endpunkt, der ein GET annimmt — oder leere das Feld, dann wird nichts gezählt. ' +
      'Die Einstellung reist mit der Datei, weitergegebene Kopien zählen also dorthin, wo du es ' +
      'entschieden hast.',
    'settings.analyticsUrlEmpty': 'leer — nichts zählen',
    'settings.aiIntegration': 'KI-Integration',
    'settings.aiActiveLabel': 'KI-Integration aktiv',
    'settings.aiActiveHint':
      'Solange dies aus ist, geht nichts aus dieser Datei an ein Modell — es gibt keinen zweiten Weg ' +
      'hinaus. Ist zusätzlich der Aufrufzähler oben aus, öffnet die Datei überhaupt keine Netzwerkverbindung.',
    'settings.on': 'an',
    'settings.off': 'aus',
    'settings.aiWarnNote':
      'Ab jetzt geht jede Frage mit den Datensätzen dieser Datei an den unten konfigurierten ' +
      'Endpunkt. In regulierten Umgebungen ist das eine Auslagerung — vorher mit der zuständigen ' +
      'Stelle abklären.',
    'settings.endpoint': 'Endpunkt',
    'settings.endpointHintSet': (url) => `Anfragen gehen an: ${url}`,
    'settings.endpointHintUnset': 'Basis-URL, meist bis einschließlich /v1. Eine Azure-api-version als Query-String anhängen.',
    'settings.model': 'Modell',
    'settings.modelHint': 'Name oder Deployment, genau wie vom Endpunkt erwartet.',
    'settings.authentication': 'Authentifizierung',
    'settings.authenticationHint': 'Bearer für OpenAI, LiteLLM und die meisten Proxys. api-key für Azure AI Foundry.',
    'settings.extraHeaders': 'Zusätzliche Header',
    'settings.extraHeadersHint':
      'Einer pro Zeile als Name: Wert, für Gateways mit eigenen Headern. Eine api-version gehört in die URL-Query.',
    'settings.apiKey': 'API-Schlüssel',
    'settings.apiKeyHint': 'Wirkt sofort für diese Sitzung. Ob er auch in der Datei landet, wird weiter unten entschieden.',
    'settings.storeKey': 'Schlüssel speichern',
    'settings.storeKeyHintStorePlain':
      'Der Schlüssel liegt dann im Klartext in einer Datei, die weitergegeben wird. Nur sinnvoll, ' +
      'wenn die Datei auf diesem Rechner bleibt — sonst vorher verschlüsseln.',
    'settings.storeKeyHintSealed': 'Der Schlüssel landet im verschlüsselten Teil der Datei und ist ohne Passphrase nicht lesbar.',
    'settings.storeKeyHintDefault': 'Ohne diesen Haken fragt die Datei beim Öffnen einmal nach dem Schlüssel. Das ist die sichere Voreinstellung.',
    'settings.storedInFile': 'in Datei gespeichert',
    'settings.sessionOnly': 'nur diese Sitzung',
    'settings.storeKeyWarn':
      'Diese Datei ist nicht verschlüsselt. Wer sie öffnet, kann den Schlüssel im Quelltext lesen. ' +
      'Entweder oben eine Passphrase setzen oder diesen Haken entfernen.',
    'settings.contextSent': 'Mitgesendeter Kontext',
    'settings.contextSentHint': 'Was bei jeder Frage mitreist: die gefilterte Ansicht, alle Datensätze, oder nur die Kennzahlen ohne Einzelfälle.',
    'settings.changesToData': 'Änderungen an den Daten',
    'settings.changesToDataHint': 'Auf ausdrückliche Anweisung darf das Modell Datensätze anlegen, ändern und löschen. Jeder Vorschlag wird geprüft und vorher angezeigt.',
    'settings.allowed': 'erlaubt',
    'settings.readOnly': 'nur lesend',
    'settings.applyWithoutAsking': 'Ohne Nachfrage anwenden',
    'settings.applyWithoutAskingHint':
      'Aus bedeutet: jeder Vorschlag erscheint als Liste, die Entscheidung liegt bei dir. Das ist ' +
      'die Voreinstellung und die einzig sinnvolle, wenn Änderungen begründet sein müssen.',
    'settings.applyImmediately': 'sofort anwenden',
    'settings.showFirst': 'erst anzeigen',
    'settings.roleOfModel': 'Rolle des Modells',
    'settings.roleOfModelHint': 'Systemanweisung, die vor jeder Frage gesendet wird.',
    'settings.temperatureLength': 'Temperatur und Länge',
    'settings.temperatureLengthHint': 'Temperatur 0 bis 2, Antwortlänge in Token.',
    'settings.testConnection': 'Verbindung testen',
    'settings.testConnectionHint': 'Ein minimaler Aufruf des Endpunkts, ohne Daten aus der Datei.',
    'settings.testing': 'testet …',
    'settings.negotiatedDialect': 'Ausgehandelter Dialekt',
    'settings.negotiatedDialectHint': 'Beim ersten erfolgreichen Aufruf ermittelt und mit der Datei gespeichert. Nach Modellwechsel zurücksetzen.',
    'settings.data': 'Daten',
    'settings.exportHint': 'Export schreibt eigene Dateien; die Anwendung selbst bleibt unberührt.',
    'settings.csv': 'CSV',
    'settings.json': 'JSON',
    'settings.configuration': 'Konfiguration',
    'settings.saveTransfer': 'Diese Einstellungen sichern oder übertragen',
    'settings.saveTransferHint':
      'Alles auf dieser Seite als JSON — ohne Datensätze und ohne API-Schlüssel. Gedacht, um eine ' +
      'funktionierende Einrichtung auf andere Werkzeuge zu übertragen.',
    'settings.configNote':
      'Beim Laden wird nur übernommen, was hier definiert ist; alles andere wird verworfen und im ' +
      'Hinweis benannt. Ist KI in der geladenen Konfiguration eingeschaltet, fragt die Anwendung ' +
      'anschließend nach dem Schlüssel.',
    'settings.copyrightPre': (year) => `© ${year} `,
    'settings.copyrightPost': ' · openToolbox · Apache License 2.0',
    'settings.runsLocally': 'Anwendung in einer Datei. Läuft lokal, ohne Server und ohne Installation.',
    'settings.probeReachable': (answer) => `Endpunkt erreichbar. Antwort: ${answer}`,
    'settings.logoApplied': 'Logo übernommen.',
    'settings.logoAppliedRemoved': (removed) => `Logo übernommen. Zur Sicherheit entfernt: ${removed}.`,
  },
}

/** Übersetzt `key` in `locale`; fällt auf DEFAULT_LOCALE und dann auf den Key selbst zurück. */
export function t(locale, key, ...args) {
  const entry = STRINGS[locale]?.[key] ?? STRINGS[DEFAULT_LOCALE][key] ?? key
  return typeof entry === 'function' ? entry(...args) : entry
}

/** Gebundener Übersetzer für eine Komponente: `const tr = translator(locale)`, dann `tr('key')`. */
export const translator = (locale) => (key, ...args) => t(locale, key, ...args)
