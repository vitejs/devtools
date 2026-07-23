import type { DevToolsDockEntriesGrouped, DevToolsDockEntry, DevToolsDocksUserSettings, DevToolsViewGroup } from '@vitejs/devtools-kit'
import type { Immutable } from 'devframe/utils/shared-state'
import type { WhenContext } from 'devframe/utils/when'
import { DEVTOOLS_INSPECTOR_DOCK_ID } from '@vitejs/devtools-kit/constants'
import { evaluateWhen } from 'devframe/utils/when'
import { DEFAULT_CATEGORIES_ORDER } from '../constants'

export type { DevToolsDocksUserSettings }
export type { DevToolsDockEntriesGrouped }

/**
 * Synthetic category that collects pinned dock entries. Pinning re-buckets an
 * entry here instead of merely floating it to the top of its home category, so
 * pinned entries lead the dock bar (and, for grouped members, lead inside their
 * group). The `~` prefix marks it internal, mirroring `~builtin`; it is never
 * user-hideable and does not exist upstream in `DEFAULT_CATEGORIES_ORDER`.
 */
export const PINNED_CATEGORY = '~pinned'

/**
 * Order weight for {@link PINNED_CATEGORY}. Strongly negative so the Pinned
 * bucket always sorts before every real category (`framework` leads the
 * upstream table at `-100`). Applied as a local override in the sort rather
 * than added to the upstream `DEFAULT_CATEGORIES_ORDER` table, keeping the pin
 * feature entirely client-side.
 */
export const PINNED_CATEGORY_ORDER = -100000

/**
 * Resolve a category's sort weight, layering the local {@link PINNED_CATEGORY}
 * override, then a caller-supplied `overrides` map (a group's own
 * {@link DevToolsViewGroup.categoryOrder}), on top of the upstream
 * {@link DEFAULT_CATEGORIES_ORDER} table. `overrides` is per-call — passing a
 * group's map only reweights that group's in-group sub-categories, never the
 * outer bar or any other group.
 */
function categoryOrder(category: string, overrides?: Record<string, number>): number {
  if (category === PINNED_CATEGORY)
    return PINNED_CATEGORY_ORDER
  return overrides?.[category] ?? DEFAULT_CATEGORIES_ORDER[category] ?? 0
}

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
  [PINNED_CATEGORY]: 'Pinned',
}

/**
 * Internal categories the user cannot hide via `docksCategoriesHidden`. Both
 * are `~`-prefixed synthetic buckets: `~builtin` (always-present built-ins) and
 * `~pinned` (the pinned bucket, whose membership the user controls per-entry
 * via the pin toggle instead).
 */
export function isCategoryHideable(category: string): boolean {
  return category !== '~builtin' && category !== PINNED_CATEGORY
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
 * same way the dock bar sorts (custom order, then default order). Members
 * hidden by user settings or a falsy `when` clause are filtered out unless
 * `includeHidden`.
 *
 * A member's own `category` field is its in-group sub-category (defaulting to
 * `'default'`) — the group's `category` is the *outer* bucket the whole group
 * lives in, so it never bleeds into the sub-category split here. A pinned member
 * moves to a `~pinned` sub-category (leading the group, via
 * {@link PINNED_CATEGORY_ORDER}). Sub-categories are ordered by the same
 * {@link DEFAULT_CATEGORIES_ORDER} table as top-level categories — unless the
 * group entry itself sets {@link DevToolsViewGroup.categoryOrder}, whose
 * weights take precedence for this group's sub-categories only, leaving every
 * other group and the outer bar on the shared table. Sub-categories are not
 * independently hideable (the outer category-hide toggle does not apply
 * inside a group).
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
  const group = entries.find((e): e is DevToolsViewGroup => e.type === 'group' && e.id === groupId)
  // Group by the members' own `category` (the in-group sub-category), never the
  // group's category. Category-hide is an outer-bar concern, so it is ignored.
  // The group's own `categoryOrder`, if set, reweights only this split.
  return docksGroupByCategories(members, settings, { ...options, ignoreCategoryHidden: true, categoryOrderOverride: group?.categoryOrder })
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
 * Filters out hidden entries and categories, then sorts by custom order and
 * default order within each category.
 *
 * Outer bucketing follows the dual role of `category`: a grouped member whose
 * `groupId` resolves to a registered group takes that **group's** `category` as
 * its outer bucket (its own `category` is the in-group sub-category instead).
 * When `collapseGroups` is set those members are folded away entirely and only
 * the group entry — carrying the group's own `category` — represents them on the
 * bar, so the outer bucket is always the group's category. Orphan members
 * (whose `groupId` references no registered group) fall back to their own
 * `category`.
 *
 * Pinning re-buckets an entry into {@link PINNED_CATEGORY} in place of the
 * category slot it would otherwise occupy — the outer bucket for a top-level
 * entry or group button, or the in-group sub-category for a member (the
 * members-only in-group split has no group entries, so `resolvedGroupCategory`
 * is undefined there and the member's own category slot is the one replaced).
 * A grouped member's outer bucket is never re-pinned, so pinning a member
 * reorders it inside its group rather than promoting it onto the top-level bar.
 * Because the pinned bucket is chosen before the category-hide check and is
 * itself never hideable, a pinned entry stays visible even when its original
 * category is hidden.
 *
 * `categoryOrderOverride` reweights the categories produced by *this call*
 * (used by {@link getGroupMembersGrouped} to apply a group's own
 * {@link DevToolsViewGroup.categoryOrder} to its in-group sub-category split)
 * — it never touches the shared {@link DEFAULT_CATEGORIES_ORDER} table, so it
 * has no effect on any other call, group, or the outer bar.
 */
export function docksGroupByCategories(
  entries: DevToolsDockEntry[],
  settings: Immutable<DevToolsDocksUserSettings>,
  options?: { includeHidden?: boolean, whenContext?: WhenContext, collapseGroups?: boolean, ignoreCategoryHidden?: boolean, categoryOrderOverride?: Record<string, number> },
): DevToolsDockEntriesGrouped {
  const { docksHidden, docksCategoriesHidden, docksCustomOrder, docksPinned } = settings
  const { includeHidden = false, whenContext, collapseGroups = false, ignoreCategoryHidden = false, categoryOrderOverride } = options ?? {}

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
    const ownCategory = resolvedGroupCategory ?? entry.category ?? 'default'
    // A pinned entry re-buckets into `~pinned` in place of the category slot it
    // occupies — but only that slot. Top-level entries and group buttons
    // (`resolvedGroupCategory === undefined`) move to the top-level `~pinned`
    // bucket; members in the in-group split (also undefined there) move to a
    // `~pinned` sub-category. A grouped member's OUTER bucket
    // (`resolvedGroupCategory` defined) is left alone, so pin never promotes it
    // off its group and onto the bar.
    const category = docksPinned.includes(entry.id) && resolvedGroupCategory === undefined
      ? PINNED_CATEGORY
      : ownCategory
    // Skip if category is hidden (an outer-bar concern; not applied in-group).
    // `~pinned` is never hideable, so a pinned entry survives its original
    // category being hidden.
    if (!includeHidden && !ignoreCategoryHidden && docksCategoriesHidden.includes(category))
      continue

    if (!map.has(category))
      map.set(category, [])
    map.get(category)!.push(entry)
  }

  const grouped = Array
    .from(map.entries())
    .sort(([a], [b]) => {
      const ia = categoryOrder(a, categoryOrderOverride)
      const ib = categoryOrder(b, categoryOrderOverride)
      return ib === ia ? b.localeCompare(a) : ia - ib
    })

  grouped.forEach(([_, items]) => {
    // Ordering within a category (including the `~pinned` bucket, where every
    // entry is pinned): custom order first, then default order, then title.
    items.sort((a, b) => {
      // Custom order
      const customOrderA = docksCustomOrder[a.id] ?? 0
      const customOrderB = docksCustomOrder[b.id] ?? 0
      if (customOrderA !== customOrderB)
        return customOrderA - customOrderB

      // Default order
      const ia = a.defaultOrder ?? 0
      const ib = b.defaultOrder ?? 0
      return ib === ia ? b.title.localeCompare(a.title) : ia - ib
    })
  })

  return grouped
}

export interface SidebarCapacityOptions {
  /** Measured height of the rail root, in px. */
  availableHeight: number
  /**
   * Fixed vertical overhead that is always present regardless of member count:
   * the root's padding, the pinned group anchor, and the anchor divider.
   */
  reservedHeight: number
  /** Height of one member button, including its inter-item gap. */
  itemHeight: number
  /** Height of one sub-category divider, including its gaps. */
  dividerHeight: number
  /** Height of the "show more" button, including its gap. */
  moreButtonHeight: number
  /** Number of sub-category dividers that could render (sub-categories − 1). */
  dividerCount: number
  /** Total member count across every sub-category. */
  totalItems: number
}

/**
 * Derive how many group side nav member buttons fit in the measured rail height.
 *
 * Two-pass: first test whether every member fits with no show-more button; if
 * they do, the full count is returned (no button, no overflow). Otherwise the
 * show-more button's height is reserved and the capacity recomputed, so the
 * button only ever costs a slot when it is actually shown.
 *
 * The sub-category divider budget is subtracted up front for every divider that
 * might render, keeping the estimate conservative — the rail may fold one
 * member early into the popover, but it never clips.
 */
export function deriveSidebarCapacity(options: SidebarCapacityOptions): number {
  const { availableHeight, reservedHeight, itemHeight, dividerHeight, moreButtonHeight, dividerCount, totalItems } = options

  if (totalItems <= 0 || itemHeight <= 0)
    return 0

  const budget = availableHeight - reservedHeight - Math.max(0, dividerCount) * dividerHeight

  // Pass 1: does everything fit without a show-more button?
  const fitWithoutButton = Math.floor(budget / itemHeight)
  if (fitWithoutButton >= totalItems)
    return totalItems

  // Pass 2: overflow is unavoidable, so reserve the show-more button's slot.
  const fitWithButton = Math.floor((budget - moreButtonHeight) / itemHeight)
  return Math.max(0, fitWithButton)
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
