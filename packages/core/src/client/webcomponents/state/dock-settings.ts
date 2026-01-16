import type { DevToolsDockEntry, DevToolsDocksUserSettings } from '@vitejs/devtools-kit'
import type { Immutable } from '@vitejs/devtools-kit/utils/shared-state'
import { DEFAULT_CATEGORIES_ORDER } from '../constants'

export type { DevToolsDocksUserSettings }

export type DevToolsDockEntriesGrouped = [category: string, entries: DevToolsDockEntry[]][]

export interface SplitGroupsResult {
  visible: DevToolsDockEntriesGrouped
  overflow: DevToolsDockEntriesGrouped
}

/**
 * Group and sort dock entries based on user settings.
 * Filters out hidden entries and categories, sorts by pinned status, custom order, and default order.
 */
export function docksGroupByCategories(
  entries: DevToolsDockEntry[],
  settings: Immutable<DevToolsDocksUserSettings>,
  options?: { includeHidden?: boolean },
): DevToolsDockEntriesGrouped {
  const { hiddenDocks, hiddenCategories, customOrder, pinnedDocks } = settings
  const { includeHidden = false } = options ?? {}

  const map = new Map<string, DevToolsDockEntry[]>()
  for (const entry of entries) {
    // Skip if hidden by entry property
    if (entry.isHidden && !includeHidden)
      continue
    if (!includeHidden && hiddenDocks.includes(entry.id))
      continue

    const category = entry.category ?? 'default'
    // Skip if category is hidden
    if (!includeHidden && hiddenCategories.includes(category))
      continue

    if (!map.has(category))
      map.set(category, [])
    map.get(category)!.push(entry)
  }

  const grouped = Array
    .from(map.entries())
    .sort(([a], [b]) => {
      const ia = DEFAULT_CATEGORIES_ORDER[a] || 0
      const ib = DEFAULT_CATEGORIES_ORDER[b] || 0
      return ib === ia ? b.localeCompare(a) : ia - ib
    })

  grouped.forEach(([_, items]) => {
    items.sort((a, b) => {
      // Pinned entries come first
      const aPinned = pinnedDocks.includes(a.id)
      const bPinned = pinnedDocks.includes(b.id)
      if (aPinned !== bPinned)
        return aPinned ? -1 : 1

      // Then sort by custom order
      const customOrderA = customOrder[a.id] ?? 0
      const customOrderB = customOrder[b.id] ?? 0
      if (customOrderA !== customOrderB)
        return customOrderA - customOrderB

      // Finally by default order
      const ia = a.defaultOrder ?? 0
      const ib = b.defaultOrder ?? 0
      return ib === ia ? b.title.localeCompare(a.title) : ia - ib
    })
  })

  return grouped
}

/**
 * Split grouped entries into visible and overflow based on capacity.
 */
export function docksSplitGroupsWithCapacity(
  groups: DevToolsDockEntriesGrouped,
  capacity: number,
): SplitGroupsResult {
  const visible: DevToolsDockEntriesGrouped = []
  const overflow: DevToolsDockEntriesGrouped = []
  let left = capacity

  for (const [category, items] of groups) {
    if (left <= 0) {
      overflow.push([category, items])
    }
    else if (items.length > left) {
      visible.push([category, items.slice(0, left)])
      overflow.push([category, items.slice(left)])
      left = 0
    }
    else {
      left -= items.length
      visible.push([category, items])
    }
  }

  return { visible, overflow }
}
