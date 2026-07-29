export type DateGroupKey = 'today' | 'week' | 'month' | 'older'

export interface DateGroupConfig {
  key: DateGroupKey
  label: string
  defaultOpen: boolean
}

/**
 * Ordered group definitions for bucketing timestamped items by recency.
 * `defaultOpen` controls whether the group is expanded when first rendered —
 * only the most recent buckets (today/this week) start open.
 */
export const DATE_GROUPS: DateGroupConfig[] = [
  { key: 'today', label: 'Today', defaultOpen: true },
  { key: 'week', label: 'This Week', defaultOpen: true },
  { key: 'month', label: 'This Month', defaultOpen: false },
  { key: 'older', label: 'Older', defaultOpen: false },
]

/**
 * Buckets an epoch-millisecond timestamp into a `DateGroupKey` relative to `now`:
 * - `today`: same calendar day as `now`
 * - `week`: earlier in the current calendar week (Sunday–Saturday)
 * - `month`: earlier in the current calendar month
 * - `older`: anything before the current calendar month
 */
export function getDateGroupKey(timestamp: number, now = new Date()): DateGroupKey {
  const date = new Date(timestamp)

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (date >= startOfToday)
    return 'today'

  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  if (date >= startOfWeek)
    return 'week'

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  if (date >= startOfMonth)
    return 'month'

  return 'older'
}

/**
 * Groups a list of items by `getDateGroupKey`, preserving each group's
 * incoming item order, and returns only the non-empty groups in `DATE_GROUPS` order.
 */
export function groupByDate<T>(items: T[], getTimestamp: (item: T) => number, now = new Date()) {
  const buckets = new Map<DateGroupKey, T[]>()
  for (const item of items) {
    const key = getDateGroupKey(getTimestamp(item), now)
    const bucket = buckets.get(key)
    if (bucket)
      bucket.push(item)
    else
      buckets.set(key, [item])
  }

  return DATE_GROUPS
    .map(config => ({ ...config, items: buckets.get(config.key) ?? [] }))
    .filter(group => group.items.length > 0)
}
