// SPDX-License-Identifier: Apache-2.0
/**
 * Strichicons, 24er-Raster, folgen currentColor und der Schriftgröße.
 * Bewusst wenige und bewusst inline — jede externe Icon-Bibliothek würde
 * die Einzeldatei aufblähen oder Nachladen erzwingen.
 */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 1.8,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  width: '1em',
  height: '1em',
  'aria-hidden': 'true',
}

export const IconSave = (props) => (
  <svg {...base} {...props}>
    <path d="M4.5 4.5h11.2L19.5 8.3v11.2a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
    <path d="M8 4.5v5h7v-5" />
    <rect x="7" y="13" width="10" height="7.5" />
  </svg>
)

export const IconSettings = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.4 14.2a1.4 1.4 0 0 0 .3 1.6l.1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.4 1.4 0 0 0-1.6-.3 1.4 1.4 0 0 0-.9 1.3v.2a1.7 1.7 0 1 1-3.4 0v-.1a1.4 1.4 0 0 0-1-1.3 1.4 1.4 0 0 0-1.5.3l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.4 1.4 0 0 0 .3-1.6 1.4 1.4 0 0 0-1.3-.8h-.2a1.7 1.7 0 1 1 0-3.4h.1a1.4 1.4 0 0 0 1.3-1 1.4 1.4 0 0 0-.3-1.5l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.4 1.4 0 0 0 1.6.3h.1a1.4 1.4 0 0 0 .8-1.3v-.2a1.7 1.7 0 1 1 3.4 0v.1a1.4 1.4 0 0 0 .9 1.3 1.4 1.4 0 0 0 1.5-.3l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.4 1.4 0 0 0-.3 1.6v.1a1.4 1.4 0 0 0 1.3.8h.2a1.7 1.7 0 1 1 0 3.4h-.1a1.4 1.4 0 0 0-1.3.9Z" />
  </svg>
)

export const IconBack = (props) => (
  <svg {...base} {...props}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const IconLock = (props) => (
  <svg {...base} {...props}>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="1" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </svg>
)

export const IconChat = (props) => (
  <svg {...base} {...props}>
    <path d="M20 12.5c0 4-3.6 7.2-8 7.2-1 0-2-.2-2.9-.5L4 21l1.6-3.8A6.9 6.9 0 0 1 4 12.5c0-4 3.6-7.2 8-7.2s8 3.2 8 7.2Z" />
  </svg>
)

export const IconSend = (props) => (
  <svg {...base} {...props}>
    <path d="M4.5 12h14" />
    <path d="M13 6.5 18.5 12 13 17.5" />
  </svg>
)

export const IconChevron = (props) => (
  <svg {...base} {...props}>
    <path d="M6 9.5l6 6 6-6" />
  </svg>
)

export const IconPaperclip = (props) => (
  <svg {...base} {...props}>
    <path d="M19 11.5 12.3 18.2a4.2 4.2 0 0 1-6-6l7.1-7.1a2.8 2.8 0 0 1 4 4l-7.1 7.1a1.4 1.4 0 0 1-2-2l6.4-6.4" />
  </svg>
)

/* Ersatzsymbol fuer einen Verweis in der Dateizeile, dem keine eigene SVG
   mitgegeben wurde. */
export const IconLink = (props) => (
  <svg {...base} {...props}>
    <path d="M10.6 13.4a3.6 3.6 0 0 0 5.1 0l2.8-2.8a3.6 3.6 0 0 0-5.1-5.1l-1.2 1.2" />
    <path d="M13.4 10.6a3.6 3.6 0 0 0-5.1 0l-2.8 2.8a3.6 3.6 0 0 0 5.1 5.1l1.2-1.2" />
  </svg>
)

/* Kleine Buero-Klammer fuer die Anhangzeile - dieselbe Form wie IconPaperclip,
   nur ohne die Groessenbindung an die Schrift. */
export const IconPaperclipSmall = (props) => (
  <svg {...base} width="14" height="14" {...props}>
    <path d="M19 11.5 12.3 18.2a4.2 4.2 0 0 1-6-6l7.1-7.1a2.8 2.8 0 0 1 4 4l-7.1 7.1a1.4 1.4 0 0 1-2-2l6.4-6.4" />
  </svg>
)
