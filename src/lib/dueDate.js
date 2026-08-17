// SPDX-License-Identifier: Apache-2.0
/**
 * Groups records across entities by due date, for the dashboard widget:
 * overdue (before today), this week (today through this week's Sunday) and
 * upcoming (the 30 days after that Sunday). An entity opts in by setting
 * `schema.dueDate` to a field key - a plain date field or a computed one, the
 * same way `schema.totalField` points at a number field. Entities without it
 * are skipped entirely, which is what keeps a domain that never mentions
 * `dueDate` untouched.
 *
 * `today` is a parameter, not a call to `new Date()` inside this function -
 * an "overdue" bucket that can only be tested against whatever day the test
 * happens to run on is not really tested. Callers that do want the real date
 * pass nothing and get `new Date()` from the default parameter.
 *
 * Comparisons run on local calendar dates. A date field holds a day like
 * "2026-08-20", not an instant - parsing it as UTC midnight would shift it by
 * a day in every timezone west of Greenwich.
 */
import { fieldValue } from './entities.js'

function localDateFromIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
  if (!match) return null
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

/** Sunday of the local calendar week `date` falls in (week runs Monday–Sunday). */
function endOfWeek(date) {
  const dow = date.getDay() // 0 = Sunday .. 6 = Saturday
  const toSunday = dow === 0 ? 0 : 7 - dow
  const sunday = new Date(date)
  sunday.setDate(date.getDate() + toSunday)
  return sunday
}

export function groupByDueDate(entities, recordsByEntity, { today = new Date() } = {}) {
  const day = startOfDay(today)
  const sunday = endOfWeek(day)
  const upcomingEnd = new Date(sunday)
  upcomingEnd.setDate(sunday.getDate() + 30)

  const groups = { overdue: [], thisWeek: [], upcoming: [] }

  for (const [entityKey, entity] of Object.entries(entities)) {
    const key = entity.schema.dueDate
    if (!key) continue
    for (const record of recordsByEntity[entityKey] ?? []) {
      // A finished record isn't due anymore - counting it would make the
      // widget flag work that is already done as overdue.
      if (entity.isDone(record)) continue
      const value = fieldValue(entity, record, key)
      const due = localDateFromIso(value)
      if (!due) continue
      const item = { entityKey, entity, record, value, due }
      if (due < day) groups.overdue.push(item)
      else if (due <= sunday) groups.thisWeek.push(item)
      else if (due <= upcomingEnd) groups.upcoming.push(item)
    }
  }

  for (const list of Object.values(groups)) list.sort((a, b) => a.due - b.due)
  return groups
}

/** Whether any entity has opted into the due-date widget at all. */
export const hasDueDates = (entities) => Object.values(entities).some((e) => e.schema.dueDate)
