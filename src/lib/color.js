// SPDX-License-Identifier: Apache-2.0

/**
 * Kleine Farbwerkzeuge für die anpassbare Palette.
 *
 * Der Anwender wählt wenige Grundfarben; die Abstufungen daraus zu rechnen ist
 * verlässlicher, als ihn acht Farbfelder ausfüllen zu lassen und dann mit einer
 * unlesbaren Oberfläche dazustehen.
 */

export const isHex = (value) => /^#[0-9a-f]{6}$/i.test(String(value ?? ''))

const toRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

const toHex = (rgb) =>
  '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')

/** Mischt eine Farbe mit Weiß (amount > 0) oder Schwarz (amount < 0). */
export function shade(hex, amount) {
  if (!isHex(hex)) return hex
  const target = amount > 0 ? 255 : 0
  const ratio = Math.abs(amount)
  return toHex(toRgb(hex).map((v) => v + (target - v) * ratio))
}

/** Relative Leuchtdichte nach WCAG — entscheidet über Schrift auf Fläche. */
export function luminance(hex) {
  if (!isHex(hex)) return 0
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrastRatio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Leitet aus zwei gewählten Farben den vollständigen Satz ab, den die
 * Oberfläche braucht. Zurückgegeben werden CSS-Variablen, die auf dem
 * Wurzelelement gesetzt und damit von allen Ebenen geerbt werden.
 */
export function paletteVariables(colors) {
  const vars = {}
  if (isHex(colors.accent)) {
    vars['--tone-accent'] = colors.accent
    vars['--tone-accent-deep'] = shade(colors.accent, -0.3)
    vars['--tone-accent-light'] = shade(colors.accent, 0.5)
    vars['--tone-accent-soft'] = shade(colors.accent, 0.9)
    vars['--tone-dark-accent-soft'] = shade(colors.accent, -0.62)
  }
  if (isHex(colors.band)) vars['--tone-band'] = colors.band
  if (isHex(colors.flag)) vars['--tone-flag'] = colors.flag
  if (isHex(colors.ok)) {
    vars['--tone-ok'] = colors.ok
    vars['--tone-ok-soft'] = shade(colors.ok, 0.88)
  }
  if (isHex(colors.pending)) vars['--tone-pending'] = colors.pending
  return vars
}
