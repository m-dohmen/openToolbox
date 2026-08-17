// SPDX-License-Identifier: Apache-2.0
/**
 * Session-only undo/redo over the record state. Nothing here touches the
 * file - the stacks live in memory for the lifetime of the tab and replay a
 * state already held, they never diff or serialise one. Capped so a long
 * session of edits does not grow the history without bound; the drop is the
 * oldest entry, not the newest, since that is the one nobody is about to
 * reach for.
 */
export const HISTORY_LIMIT = 50

/** Pushes a state onto a stack, dropping the oldest entry past the limit. */
export function pushHistory(stack, entry) {
  const grown = [...stack, entry]
  return grown.length > HISTORY_LIMIT ? grown.slice(grown.length - HISTORY_LIMIT) : grown
}
