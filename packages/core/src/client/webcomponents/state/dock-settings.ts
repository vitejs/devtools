import type { DevToolsDockEntriesGrouped, DevToolsDockEntry, DevToolsDocksUserSettings, DevToolsViewGroup } from '@vitejs/devtools-kit'
import type { Immutable } from 'devframe/utils/shared-state'
import type { WhenContext } from 'devframe/utils/when'
import { DEVTOOLS_INSPECTOR_DOCK_ID } from '@vitejs/devtools-kit/constants'
import { evaluateWhen } from 'devframe/utils/when'
import { DEFAULT_CATEGORIES_ORDER } from '../constants'

export type { DevToolsDocksUserSettings }
export type { DevToolsDockEntriesGrouped }

export interface SplitGroupsResult {
  visible: DevToolsDockEntriesGrouped
  overflow: DevToolsDockEntriesGrouped
}

/**
 * Resolve a dock entry's icon down to a single icon string.
 *
 * A dock icon may be a string or a `{ light, dark }` pair, but a command's icon
 * is string-only. When projecting dock entries into commands (palette + Shortcuts
 * settings) we collapse the object form to a single string rather than dropping
 * it — otherwise object-icon docks (e.g. the built-in Vite+ group) lose their
 * icon entirely. Returns `undefined` only when no icon is available.
 */
export function resolveCommandIcon(icon: DevToolsDockEntry['icon']): string | undefined {
  if (typeof icon === 'string')
    return icon
  return icon?.light ?? icon?.dark
}

const CATEGORY_LABELS: Record<string, string> = {
  'default': 'Default',
  'app': 'App',
  'framework': 'Framework',
  'web': 'Web',
  'advanced': 'Advanced',
  '~builtin': 'Built-in',
}

/**
 * Human label for a dock category id, used for category headers (settings) and
 * in-group sub-category nodes (command palette). Falls back to the raw id for
 * custom categories a kit may register.
 */
export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

/**
 * Collect the ids of every registered dock group (`type: 'group'`).
 *
 * Grouping is one level deep, so a group entry never points at another group;
 * this set is the authority for deciding whether an entry's `groupId` resolves
 * to a real group (membership) or dangles (orphan — rendered as a normal
 * top-level entry).
 */
export function getRegisteredGroupIds(entries: DevToolsDockEntry[]): Set<string> {
  const ids = new Set<string>()
  for (const entry of entries) {
    if (entry.type === 'group')
      ids.add(entry.id)
  }
  return ids
}

/**
 * Resolve the group entry an entry belongs to, or `undefined` when the entry
 * is top-level or its `groupId` references a group that was never registered.
 */
export function getEntryGroup(
  entries: DevToolsDockEntry[],
  entry: DevToolsDockEntry | null | undefined,
): DevToolsViewGroup | undefined {
  if (!entry || entry.type === 'group' || !entry.groupId)
    return undefined
  const group = entries.find(e => e.id === entry.groupId)
  return group?.type === 'group' ? group : undefined
}

/**
 * Group a group's members by their **in-group sub-category** and sort them the
 * same way the dock bar sorts (pinned, custom order, default order). Members
 * hidden by user settings or a falsy `when` clause are filtered out unless
 * `includeHidden`.
 *
 * A member's own `category` field is its in-group sub-category (defaulting to
 * `'default'`) — the group's `category` is the *outer* bucket the whole group
 * lives in, so it never bleeds into the sub-category split here. Sub-categories
 * are ordered by the same {@link DEFAULT_CATEGORIES_ORDER} table as top-level
 * categories, but they are not independently hideable (the outer category-hide
 * toggle does not apply inside a group).
 */
export function getGroupMembersGrouped(
  entries: DevToolsDockEntry[],
  groupId: string,
  settings?: Immutable<DevToolsDocksUserSettings>,
  options?: { includeHidden?: boolean, whenContext?: WhenContext },
): DevToolsDockEntriesGrouped {
  const members = entries.filter(e => e.type !== 'group' && e.groupId === groupId)
  if (!settings)
    return members.length ? [['default', members]] : []
  // Group by the members' own `category` (the in-group sub-category), never the
  // group's category. Category-hide is an outer-bar concern, so it is ignored.
  return docksGroupByCategories(members, settings, { ...options, ignoreCategoryHidden: true })
}

/**
 * List the member entries of a group as a flat array, preserving the same
 * sub-category order + sorting {@link getGroupMembersGrouped} produces. Members
 * hidden by user settings or a falsy `when` clause are filtered out unless
 * `includeHidden`. Use this where the caller only needs the members in display
 * order (e.g. the group button's active check, empty-group detection); use
 * {@link getGroupMembersGrouped} where the in-group sub-category split matters.
 */
export function getGroupMembers(
  entries: DevToolsDockEntry[],
  groupId: string,
  settings?: Immutable<DevToolsDocksUserSettings>,
  options?: { includeHidden?: boolean, whenContext?: WhenContext },
): DevToolsDockEntry[] {
  return getGroupMembersGrouped(entries, groupId, settings, options).flatMap(([, items]) => items)
}

/**
 * Group and sort dock entries based on user settings.
 * Filters out hidden entries and categories, sorts by pinned status, custom order, and default order.
 *
 * Outer bucketing follows the dual role of `category`: a grouped member whose
 * `groupId` resolves to a registered group takes that **group's** `category` as
 * its outer bucket (its own `category` is the in-group sub-category instead).
 * When `collapseGroups` is set those members are folded away entirely and only
 * the group entry — carrying the group's own `category` — represents them on the
 * bar, so the outer bucket is always the group's category. Orphan members
 * (whose `groupId` references no registered group) fall back to their own
 * `category`.
 */
export function docksGroupByCategories(
  entries: DevToolsDockEntry[],
  settings: Immutable<DevToolsDocksUserSettings>,
  options?: { includeHidden?: boolean, whenContext?: WhenContext, collapseGroups?: boolean, ignoreCategoryHidden?: boolean },
): DevToolsDockEntriesGrouped {
  const { docksHidden, docksCategoriesHidden, docksCustomOrder, docksPinned } = settings
  const { includeHidden = false, whenContext, collapseGroups = false, ignoreCategoryHidden = false } = options ?? {}

  // Map every registered group id to its resolved outer category. A grouped
  // member's OUTER bucket is its group's category (the member's own `category`
  // is its in-group sub-category); the group entry itself carries this same
  // category. When only members are passed (the in-group split), no group entry
  // is present here, so members fall back to their own `category` — exactly the
  // sub-category behaviour we want.
  const groupCategories = new Map<string, string>()
  for (const entry of entries) {
    if (entry.type === 'group')
      groupCategories.set(entry.id, entry.category ?? 'default')
  }

  const map = new Map<string, DevToolsDockEntry[]>()
  for (const entry of entries) {
    const resolvedGroupCategory = entry.type !== 'group' && entry.groupId
      ? groupCategories.get(entry.groupId)
      : undefined

    // Collapse grouped members out of the top-level bar (orphans stay visible)
    if (collapseGroups && resolvedGroupCategory !== undefined)
      continue

    // Skip if hidden by `when` clause
    if (entry.when && whenContext && !evaluateWhen(entry.when, whenContext) && !includeHidden)
      continue
    if (entry.when && !whenContext && entry.when === 'false' && !includeHidden)
      continue
    // The Devframe Inspector is hidden by default; it only joins the dock bar
    // once opted into via Settings → Advanced. The settings management view
    // (`includeHidden`) still lists it so users can discover the toggle.
    if (!includeHidden && entry.id === DEVTOOLS_INSPECTOR_DOCK_ID && !settings.showDevframeInspector)
      continue
    if (!includeHidden && docksHidden.includes(entry.id))
      continue

    // Outer bucket: the group's category for grouped members, else the entry's
    // own category. Orphans (groupId with no registered group) fall through to
    // their own `category`.
    const category = resolvedGroupCategory ?? entry.category ?? 'default'
    // Skip if category is hidden (an outer-bar concern; not applied in-group)
    if (!includeHidden && !ignoreCategoryHidden && docksCategoriesHidden.includes(category))
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
      const aPinned = docksPinned.includes(a.id)
      const bPinned = docksPinned.includes(b.id)
      if (aPinned !== bPinned)
        return aPinned ? -1 : 1

      // Then sort by custom order
      const customOrderA = docksCustomOrder[a.id] ?? 0
      const customOrderB = docksCustomOrder[b.id] ?? 0
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
