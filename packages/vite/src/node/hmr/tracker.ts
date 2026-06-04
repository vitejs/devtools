import type { HmrUpdate } from '../../shared/types'

/** Maximum number of HMR events retained in the circular buffer. */
const MAX_HISTORY = 200

/**
 * Creates an in-memory tracker that records HMR events from Vite's
 * `hotUpdate` hook and exposes them to the client via RPC.
 */
export function createHmrTracker() {
  const updates: HmrUpdate[] = []
  let counter = 0

  /** Prepend a new update to the history, evicting the oldest entry if full. */
  function record(update: Omit<HmrUpdate, 'id'>) {
    const entry: HmrUpdate = { ...update, id: String(++counter) }
    updates.unshift(entry)
    if (updates.length > MAX_HISTORY) {
      updates.length = MAX_HISTORY
    }
    return entry
  }

  /** Return all recorded updates, newest first. */
  function getUpdates() {
    return updates
  }

  /** Discard all recorded updates. */
  function clear() {
    updates.length = 0
  }

  return { record, getUpdates, clear }
}

export type HmrTracker = ReturnType<typeof createHmrTracker>
