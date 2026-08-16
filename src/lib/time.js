// SPDX-License-Identifier: Apache-2.0
/**
 * Relative age of a timestamp as a bucket + count, kept apart from the i18n
 * text so the thresholds can be tested without a locale. The FileBar maps
 * `unit` onto a translation key and passes `n` as its argument.
 */
export function relativeAge(iso, now = Date.now()) {
  const then = new Date(iso).getTime()
  const seconds = Math.max(0, Math.floor((now - then) / 1000))
  if (seconds < 60) return { unit: 'now', n: 0 }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return { unit: 'minutes', n: minutes }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { unit: 'hours', n: hours }
  const days = Math.floor(hours / 24)
  if (days < 30) return { unit: 'days', n: days }
  const months = Math.floor(days / 30)
  if (months < 12) return { unit: 'months', n: months }
  return { unit: 'years', n: Math.floor(days / 365) }
}
