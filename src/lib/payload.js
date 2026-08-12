// SPDX-License-Identifier: Apache-2.0
/**
 * Die HTML-Datei ist gleichzeitig die Datenbank.
 * Beim Start wird der unveränderte Dokument-Quelltext gesichert; beim Speichern
 * wird darin nur der Payload-Block ersetzt und das Ergebnis als neue Datei geschrieben.
 */

const PAYLOAD_ID = 'sb-payload'

// Muss laufen, bevor die App den DOM verändert.
const PRISTINE_HTML = '<!doctype html>\n' + document.documentElement.outerHTML

const PAYLOAD_RE = new RegExp(
  `(<script\\b[^>]*id="${PAYLOAD_ID}"[^>]*>)([\\s\\S]*?)(<\\/script>)`,
)

/** Liest den beim letzten Speichern eingebetteten Payload. */
export function readPayload() {
  const el = document.getElementById(PAYLOAD_ID)
  if (!el) return null
  const raw = el.textContent.trim()
  if (!raw || raw === 'null') return null
  try {
    return JSON.parse(raw)
  } catch {
    console.warn('Payload block is damaged, starting empty.')
    return null
  }
}

/** JSON so entschärfen, dass es einen <script>-Block nicht sprengen kann. */
const embedSafe = (obj) =>
  JSON.stringify(obj).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, (c) =>
    c === '\u2028' ? '\\u2028' : '\\u2029',
  )

/** Baut den vollständigen HTML-Quelltext der Anwendung mit neuem Datenstand. */
export function buildDocument(payload) {
  if (!PAYLOAD_RE.test(PRISTINE_HTML)) {
    throw new Error(`Payload block "${PAYLOAD_ID}" not found.`)
  }
  return PRISTINE_HTML.replace(PAYLOAD_RE, (_m, open, _old, close) => open + embedSafe(payload) + close)
}

export const supportsFileSystemAccess = () =>
  typeof window.showSaveFilePicker === 'function'

let fileHandle = null

export const hasFileHandle = () => fileHandle !== null

/** Schreibt in die zuvor gewählte Datei zurück, ohne erneuten Dialog. */
export async function writeToHandle(html) {
  if (!fileHandle) throw new Error('No target file selected.')
  const w = await fileHandle.createWritable()
  await w.write(new Blob([html], { type: 'text/html' }))
  await w.close()
  return fileHandle.name
}

/** Öffnet den Systemdialog und merkt sich die Zieldatei für spätere Speichervorgänge. */
export async function saveAs(html, suggestedName) {
  fileHandle = await window.showSaveFilePicker({
    suggestedName,
    types: [{ description: 'HTML application', accept: { 'text/html': ['.html'] } }],
  })
  return writeToHandle(html)
}

/** Fallback für Browser ohne File System Access API. */
export function download(content, filename, mime = 'text/html') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return filename
}

export function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}
