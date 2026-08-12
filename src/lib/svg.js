// SPDX-License-Identifier: Apache-2.0

/**
 * Prüfung und Bereinigung eines hochgeladenen Logos.
 *
 * Die Datei wird eingebettet und wandert damit zu jedem weiter, der die
 * Anwendung bekommt. Eine SVG kann Skripte, externe Verweise und
 * Ereignisbehandler enthalten — all das fliegt hier raus, bevor irgendetwas
 * in den DOM gelangt. Was übrig bleibt, ist Vektorgrafik.
 */

const FORBIDDEN_TAGS = ['script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video', 'set', 'animate', 'handler']
const URL_ATTRS = ['href', 'xlink:href', 'src', 'from', 'to', 'values']

export const MAX_LOGO_BYTES = 250_000

export function sanitizeSvg(source) {
  if (source.length > MAX_LOGO_BYTES) {
    throw new Error(`The file is larger than ${Math.round(MAX_LOGO_BYTES / 1024)} KB.`)
  }

  const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
  if (doc.querySelector('parsererror')) throw new Error('The file is not valid SVG.')

  const svg = doc.documentElement
  if (!svg || svg.nodeName.toLowerCase() !== 'svg') throw new Error('No <svg> element found.')

  const removed = []

  const walk = (node) => {
    for (const child of Array.from(node.children)) {
      const tag = child.nodeName.toLowerCase()
      if (FORBIDDEN_TAGS.includes(tag)) {
        removed.push(tag)
        child.remove()
        continue
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase()
        if (name.startsWith('on')) {
          removed.push(name)
          child.removeAttribute(attr.name)
          continue
        }
        if (URL_ATTRS.includes(name) && /^\s*(javascript|data:text\/html)/i.test(attr.value)) {
          removed.push(name)
          child.removeAttribute(attr.name)
          continue
        }
        // Externe Verweise würden die Datei vom Netz abhängig machen.
        if (URL_ATTRS.includes(name) && /^\s*https?:/i.test(attr.value)) {
          removed.push(name)
          child.removeAttribute(attr.name)
        }
      }
      walk(child)
    }
  }
  walk(svg)

  for (const attr of Array.from(svg.attributes)) {
    if (attr.name.toLowerCase().startsWith('on')) svg.removeAttribute(attr.name)
  }

  // Feste Maße stören die Skalierung im Kopf und im Wasserzeichen.
  if (!svg.getAttribute('viewBox')) {
    const w = parseFloat(svg.getAttribute('width'))
    const h = parseFloat(svg.getAttribute('height'))
    if (w > 0 && h > 0) svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  }
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.setAttribute('preserveAspectRatio', 'xMinYMid meet')

  return { svg: svg.outerHTML, removed: [...new Set(removed)] }
}
