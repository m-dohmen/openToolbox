// SPDX-License-Identifier: Apache-2.0

/**
 * Wortmarke und Wasserzeichen.
 *
 * Ohne hochgeladenes Logo wird der Produktname gesetzt: der Teil vor dem ersten
 * Großbuchstaben leicht zurückgenommen, der Rest fett. Das trägt ohne
 * Grafikdatei und funktioniert in jeder Farbe. Liegt ein bereinigtes SVG in den
 * Einstellungen, ersetzt es die Wortmarke an allen vier Stellen: Kopf,
 * Sperrbildschirm, Fußzeile der Einstellungen und Wasserzeichen.
 */

export const DEFAULT_PRODUCT = 'openToolbox'

/** Trennt "openToolbox" in "open" + "Toolbox", ohne den Namen fest zu verdrahten. */
function split(name) {
  const at = name.search(/[A-Z]/)
  if (at <= 0) return ['', name]
  return [name.slice(0, at), name.slice(at)]
}

export function Wordmark({ brand, class: className = '', ...rest }) {
  const name = brand?.name || DEFAULT_PRODUCT

  if (brand?.logo) {
    return (
      <span
        class={'wordmark wordmark--logo ' + className}
        title={name}
        dangerouslySetInnerHTML={{ __html: brand.logo }}
        {...rest}
      />
    )
  }

  const [soft, strong] = split(name)
  return (
    <span class={'wordmark ' + className} {...rest}>
      {soft && <span class="wordmark__open">{soft}</span>}
      <span class="wordmark__box">{strong}</span>
    </span>
  )
}
