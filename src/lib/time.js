// SPDX-License-Identifier: Apache-2.0
/**
 * Relative age of a timestamp as a bucket + count, kept apart from the i18n
 * text so the thresholds can be tested without a locale. The FileBar maps
 * `unit` onto a translation key and passes `n` as its argument.
 */
export function relativeAge(iso, now = Date.now()) {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return { unit: 'unknown', n: 0 }
  const seconds = Math.max(0, Math.floor((now - then) / 1000))
  if (seconds < 60) return { unit: 'now', n: 0 }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return { unit: 'minutes', n: minutes }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { unit: 'hours', n: hours }
  const days = Math.floor(hours / 24)
  if (days < 30) return { unit: 'days', n: days }
  // Der Wechsel auf "years" haengt an days, nicht am gerundeten Monats-Bucket -
  // sonst zeigt 360-364 Tage "0 years ago" (floor(364/365) = 0) statt "12 months".
  if (days < 365) return { unit: 'months', n: Math.floor(days / 30) }
  return { unit: 'years', n: Math.floor(days / 365) }
}
