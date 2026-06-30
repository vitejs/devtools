import type { BuildInfo } from '../rolldown/logs-manager'

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 200
const DEFAULT_TRACE_DEPTH = 8
const MAX_TRACE_DEPTH = 100

export function clampLimit(limit: unknown, fallback = DEFAULT_LIMIT) {
  if (typeof limit !== 'number' || !Number.isFinite(limit))
    return fallback
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)))
}

export function clampDepth(depth: unknown) {
  if (typeof depth !== 'number' || !Number.isFinite(depth))
    return DEFAULT_TRACE_DEPTH
  return Math.min(MAX_TRACE_DEPTH, Math.max(1, Math.floor(depth)))
}

export function sortByNumberDesc<T>(items: T[], getValue: (item: T) => number) {
  return items.toSorted((a, b) => getValue(b) - getValue(a))
}

export function sumBy<T>(items: Iterable<T>, getValue: (item: T) => number) {
  let total = 0
  for (const item of items) {
    total += getValue(item)
  }
  return total
}

export function percentage(value: number, total: number) {
  return total > 0 ? value / total : 0
}

export function getSessionTimestamp(sessions: BuildInfo[], id: string) {
  return sessions.find(session => session.id === id)?.timestamp
}
