import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { DEFAULT_STATE_USER_SETTINGS, DEVTOOLS_INSPECTOR_DOCK_ID } from '@vitejs/devtools-kit/constants'
import { describe, expect, it } from 'vitest'
import {
  docksGroupByCategories,
  getCategoryLabel,
  getEntryGroup,
  getGroupMembers,
  getGroupMembersGrouped,
  getRegisteredGroupIds,
  isCategoryHideable,
  PINNED_CATEGORY,
  PINNED_CATEGORY_ORDER,
  resolveCommandIcon,
} from '../dock-settings'

function iframe(id: string, extra: Partial<DevToolsDockEntry> = {}): DevToolsDockEntry {
  return { id, type: 'iframe', url: '/', title: id, icon: 'i', ...extra } as DevToolsDockEntry
}

function group(id: string, extra: Partial<DevToolsDockEntry> = {}): DevToolsDockEntry {
  return { id, type: 'group', title: id, icon: 'i', ...extra } as DevToolsDockEntry
}

const settings = DEFAULT_STATE_USER_SETTINGS()

describe('dock groups', () => {
  const entries: DevToolsDockEntry[] = [
    iframe('a'),
    group('nuxt'),
    iframe('nuxt:overview', { groupId: 'nuxt' }),
    iframe('nuxt:pages', { groupId: 'nuxt' }),
    iframe('orphan', { groupId: 'ghost' }), // references a group that doesn't exist
  ]

  it('collects registered group ids', () => {
    expect([...getRegisteredGroupIds(entries)]).toEqual(['nuxt'])
  })

  it('lists members of a group', () => {
    expect(getGroupMembers(entries, 'nuxt').map(e => e.id)).toEqual(['nuxt:overview', 'nuxt:pages'])
  })

  it('resolves the group an entry belongs to', () => {
    expect(getEntryGroup(entries, entries[2])?.id).toBe('nuxt')
    // top-level entry has no group
    expect(getEntryGroup(entries, entries[0])).toBeUndefined()
    // group entries are never members
    expect(getEntryGroup(entries, entries[1])).toBeUndefined()
  })

  it('treats members of an unregistered group as orphans (no group)', () => {
    const orphan = entries.find(e => e.id === 'orphan')!
    expect(getEntryGroup(entries, orphan)).toBeUndefined()
  })

  it('collapses grouped members under the group button on the dock bar', () => {
    const grouped = docksGroupByCategories(entries, settings, { collapseGroups: true })
    const ids = grouped.flatMap(([, items]) => items.map(i => i.id))
    // group button + ungrouped entry + orphan remain; members are folded away
    expect(ids).toContain('nuxt')
    expect(ids).toContain('a')
    expect(ids).toContain('orphan')
    expect(ids).not.toContain('nuxt:overview')
    expect(ids).not.toContain('nuxt:pages')
  })

  it('keeps members visible when not collapsing', () => {
    const grouped = docksGroupByCategories(entries, settings)
    const ids = grouped.flatMap(([, items]) => items.map(i => i.id))
    expect(ids).toContain('nuxt:overview')
    expect(ids).toContain('nuxt:pages')
  })

  it('hides members within a group via docksHidden (settings: hide inside group)', () => {
    const hidden = { ...settings, docksHidden: ['nuxt:overview'] }
    // bar/popover/sidebar consumers omit hidden members
    expect(getGroupMembers(entries, 'nuxt', hidden).map(e => e.id)).toEqual(['nuxt:pages'])
    // the settings page still lists them with includeHidden
    expect(getGroupMembers(entries, 'nuxt', hidden, { includeHidden: true }).map(e => e.id).sort())
      .toEqual(['nuxt:overview', 'nuxt:pages'])
  })

  it('orders members within a group via docksCustomOrder (settings: order inside group)', () => {
    const ordered = { ...settings, docksCustomOrder: { 'nuxt:pages': 0, 'nuxt:overview': 1 } }
    expect(getGroupMembers(entries, 'nuxt', ordered).map(e => e.id)).toEqual(['nuxt:pages', 'nuxt:overview'])
  })

  it('hides the whole group via docksHidden on the group id (settings: hide group)', () => {
    const hidden = { ...settings, docksHidden: ['nuxt'] }
    const grouped = docksGroupByCategories(entries, hidden, { collapseGroups: true })
    const ids = grouped.flatMap(([, items]) => items.map(i => i.id))
    // group button gone and members stay folded — nothing leaks onto the bar
    expect(ids).not.toContain('nuxt')
    expect(ids).not.toContain('nuxt:overview')
    expect(ids).not.toContain('nuxt:pages')
  })
})

describe('in-group sub-categories (dual role of `category`)', () => {
  // The group carries category 'framework' (the OUTER bucket for the whole
  // group); its members carry their own categories, which act as IN-GROUP
  // sub-categories. An orphan (groupId → no registered group) keeps its own
  // category as the outer bucket.
  const entries: DevToolsDockEntry[] = [
    group('nuxt', { category: 'framework' }),
    iframe('nuxt:overview', { groupId: 'nuxt', category: 'app', defaultOrder: 1 }),
    iframe('nuxt:pages', { groupId: 'nuxt', category: 'app', defaultOrder: 0 }),
    iframe('nuxt:graph', { groupId: 'nuxt', category: 'advanced' }),
    iframe('orphan', { groupId: 'ghost', category: 'web' }),
  ]

  function categoryOf(grouped: ReturnType<typeof docksGroupByCategories>, id: string): string | undefined {
    return grouped.find(([, items]) => items.some(i => i.id === id))?.[0]
  }

  it('buckets grouped members under the GROUP\'s category, not their own', () => {
    const grouped = docksGroupByCategories(entries, settings)
    // members inherit the group's outer category ('framework'), ignoring their
    // own ('app' / 'advanced') for the outer bucket
    expect(categoryOf(grouped, 'nuxt:overview')).toBe('framework')
    expect(categoryOf(grouped, 'nuxt:graph')).toBe('framework')
    // the group button itself lands in its own category
    expect(categoryOf(grouped, 'nuxt')).toBe('framework')
    // no outer 'app'/'advanced' buckets leak from the members
    expect(grouped.map(([c]) => c)).not.toContain('app')
    expect(grouped.map(([c]) => c)).not.toContain('advanced')
  })

  it('keeps the group button in the group\'s category when collapsing', () => {
    const grouped = docksGroupByCategories(entries, settings, { collapseGroups: true })
    expect(categoryOf(grouped, 'nuxt')).toBe('framework')
    // members folded away entirely
    const ids = grouped.flatMap(([, items]) => items.map(i => i.id))
    expect(ids).not.toContain('nuxt:overview')
  })

  it('falls back to the orphan\'s OWN category (unregistered group)', () => {
    const grouped = docksGroupByCategories(entries, settings)
    expect(categoryOf(grouped, 'orphan')).toBe('web')
  })

  it('splits a group\'s members by their in-group sub-category, ordered + sorted', () => {
    const sub = getGroupMembersGrouped(entries, 'nuxt', settings)
    // sub-categories ordered by the shared DEFAULT_CATEGORIES_ORDER (app < advanced)
    expect(sub.map(([c]) => c)).toEqual(['app', 'advanced'])
    // members within a sub-category sorted by defaultOrder (pages:0 before overview:1)
    expect(sub.find(([c]) => c === 'app')![1].map(e => e.id)).toEqual(['nuxt:pages', 'nuxt:overview'])
    expect(sub.find(([c]) => c === 'advanced')![1].map(e => e.id)).toEqual(['nuxt:graph'])
  })

  it('puts uncategorised members in a `default` sub-category', () => {
    const plain: DevToolsDockEntry[] = [
      group('g', { category: 'app' }),
      iframe('g:a', { groupId: 'g' }),
      iframe('g:b', { groupId: 'g' }),
    ]
    const sub = getGroupMembersGrouped(plain, 'g', settings)
    expect(sub.map(([c]) => c)).toEqual(['default'])
    // and their OUTER bucket is still the group's category
    expect(docksGroupByCategories(plain, settings).find(([, items]) => items.some(i => i.id === 'g:a'))?.[0]).toBe('app')
  })

  it('sends a group with no category, and its members, to `default`', () => {
    const plain: DevToolsDockEntry[] = [
      group('g'),
      iframe('g:a', { groupId: 'g' }),
    ]
    const grouped = docksGroupByCategories(plain, settings)
    expect(grouped.find(([, items]) => items.some(i => i.id === 'g:a'))?.[0]).toBe('default')
  })

  it('does not apply the outer category-hide toggle inside a group', () => {
    // hiding the outer 'app' category must not hide an in-group 'app' sub-section
    const hidden = { ...settings, docksCategoriesHidden: ['app'] }
    const sub = getGroupMembersGrouped(entries, 'nuxt', hidden)
    expect(sub.find(([c]) => c === 'app')?.[1].map(e => e.id)).toEqual(['nuxt:pages', 'nuxt:overview'])
  })
})

describe('per-group sub-category order override (group.categoryOrder)', () => {
  // Same shape as the sub-category fixture above ('app' before 'advanced' by
  // default), but the 'nuxt' group flips that with its own `categoryOrder`.
  const entries: DevToolsDockEntry[] = [
    group('nuxt', { category: 'framework', categoryOrder: { advanced: -1, app: 1 } }),
    iframe('nuxt:overview', { groupId: 'nuxt', category: 'app' }),
    iframe('nuxt:graph', { groupId: 'nuxt', category: 'advanced' }),
    group('other', { category: 'framework' }),
    iframe('other:page', { groupId: 'other', category: 'app' }),
    iframe('other:tools', { groupId: 'other', category: 'advanced' }),
  ]

  it('reorders sub-categories inside the overriding group only', () => {
    const sub = getGroupMembersGrouped(entries, 'nuxt', settings)
    // 'advanced' (-1) now sorts ahead of 'app' (1) — the reverse of the default table
    expect(sub.map(([c]) => c)).toEqual(['advanced', 'app'])
  })

  it('leaves other groups on the shared DEFAULT_CATEGORIES_ORDER table', () => {
    const sub = getGroupMembersGrouped(entries, 'other', settings)
    // unaffected by nuxt's override: default order is 'app' (100) before 'advanced' (400)
    expect(sub.map(([c]) => c)).toEqual(['app', 'advanced'])
  })

  it('leaves the outer dock bar unaffected', () => {
    const grouped = docksGroupByCategories(entries, settings, { collapseGroups: true })
    // both group buttons still sort by their own outer category ('framework'), untouched
    expect(grouped.map(([c]) => c)).toEqual(['framework'])
  })

  it('falls back to the shared table for sub-categories the override omits', () => {
    const partial: DevToolsDockEntry[] = [
      group('g', { category: 'framework', categoryOrder: { advanced: -1 } }),
      iframe('g:a', { groupId: 'g', category: 'app' }),
      iframe('g:b', { groupId: 'g', category: 'advanced' }),
      iframe('g:c', { groupId: 'g', category: 'web' }),
    ]
    const sub = getGroupMembersGrouped(partial, 'g', settings)
    // 'advanced' (-1, overridden) leads; 'app' (100) and 'web' (300) keep the shared order
    expect(sub.map(([c]) => c)).toEqual(['advanced', 'app', 'web'])
  })
})

describe('pinning re-buckets into the ~pinned category', () => {
  function categoryOf(grouped: ReturnType<typeof docksGroupByCategories>, id: string): string | undefined {
    return grouped.find(([, items]) => items.some(i => i.id === id))?.[0]
  }

  it('moves a pinned top-level entry into the ~pinned category', () => {
    const entries: DevToolsDockEntry[] = [
      iframe('a', { category: 'app' }),
      iframe('b', { category: 'app' }),
    ]
    const pinned = { ...settings, docksPinned: ['b'] }
    const result = docksGroupByCategories(entries, pinned)
    expect(categoryOf(result, 'b')).toBe(PINNED_CATEGORY)
    expect(categoryOf(result, 'a')).toBe('app')
  })

  it('sorts the ~pinned category ahead of every real category', () => {
    const entries: DevToolsDockEntry[] = [
      iframe('fw', { category: 'framework' }), // framework leads the real table (-100)
      iframe('pinme', { category: 'advanced' }),
    ]
    const pinned = { ...settings, docksPinned: ['pinme'] }
    const result = docksGroupByCategories(entries, pinned)
    expect(result[0]![0]).toBe(PINNED_CATEGORY)
    expect(PINNED_CATEGORY_ORDER).toBeLessThan(-100)
  })

  it('pins a group button to the top-level ~pinned category', () => {
    const entries: DevToolsDockEntry[] = [
      group('nuxt', { category: 'framework' }),
      iframe('nuxt:overview', { groupId: 'nuxt' }),
    ]
    const pinned = { ...settings, docksPinned: ['nuxt'] }
    const grouped = docksGroupByCategories(entries, pinned, { collapseGroups: true })
    expect(categoryOf(grouped, 'nuxt')).toBe(PINNED_CATEGORY)
  })

  it('pins a grouped member into a ~pinned SUB-category inside its group (no promotion to the bar)', () => {
    const entries: DevToolsDockEntry[] = [
      group('nuxt', { category: 'framework' }),
      iframe('nuxt:overview', { groupId: 'nuxt', category: 'app' }),
      iframe('nuxt:graph', { groupId: 'nuxt', category: 'advanced' }),
    ]
    const pinned = { ...settings, docksPinned: ['nuxt:graph'] }

    // The member stays folded in its group on the bar — no top-level ~pinned bucket.
    const bar = docksGroupByCategories(entries, pinned, { collapseGroups: true })
    expect(bar.map(([c]) => c)).not.toContain(PINNED_CATEGORY)

    // Inside the group it leads via a ~pinned sub-category.
    const sub = getGroupMembersGrouped(entries, 'nuxt', pinned)
    expect(sub[0]![0]).toBe(PINNED_CATEGORY)
    expect(categoryOf(sub, 'nuxt:graph')).toBe(PINNED_CATEGORY)
    expect(categoryOf(sub, 'nuxt:overview')).toBe('app')
  })

  it('keeps a pinned entry visible even when its home category is hidden', () => {
    const entries: DevToolsDockEntry[] = [
      iframe('a', { category: 'advanced' }),
      iframe('b', { category: 'advanced' }),
    ]
    const hiddenCat = { ...settings, docksCategoriesHidden: ['advanced'], docksPinned: ['b'] }
    const grouped = docksGroupByCategories(entries, hiddenCat)
    const ids = grouped.flatMap(([, items]) => items.map(i => i.id))
    // 'a' is hidden with its category; the pinned 'b' survives in ~pinned
    expect(ids).not.toContain('a')
    expect(ids).toContain('b')
    expect(categoryOf(grouped, 'b')).toBe(PINNED_CATEGORY)
  })

  it('orders multiple pinned entries by custom then default order', () => {
    const entries: DevToolsDockEntry[] = [
      iframe('x', { defaultOrder: 1 }),
      iframe('y', { defaultOrder: 0 }),
      iframe('z', { defaultOrder: 2 }),
    ]
    const pinned = { ...settings, docksPinned: ['x', 'y', 'z'], docksCustomOrder: { x: 5, y: 6, z: 1 } }
    const grouped = docksGroupByCategories(entries, pinned)
    const pinnedItems = grouped.find(([c]) => c === PINNED_CATEGORY)![1].map(e => e.id)
    // custom order wins over defaultOrder: z(1) < x(5) < y(6)
    expect(pinnedItems).toEqual(['z', 'x', 'y'])
  })
})

describe('isCategoryHideable', () => {
  it('marks ~builtin and ~pinned as non-hideable', () => {
    expect(isCategoryHideable('~builtin')).toBe(false)
    expect(isCategoryHideable(PINNED_CATEGORY)).toBe(false)
  })

  it('marks ordinary categories as hideable', () => {
    expect(isCategoryHideable('app')).toBe(true)
    expect(isCategoryHideable('framework')).toBe(true)
  })
})

describe('getCategoryLabel', () => {
  it('maps known category ids to human labels', () => {
    expect(getCategoryLabel('framework')).toBe('Framework')
    expect(getCategoryLabel('~builtin')).toBe('Built-in')
  })

  it('falls back to the raw id for custom categories', () => {
    expect(getCategoryLabel('my-custom')).toBe('my-custom')
  })
})

describe('devframe inspector visibility (settings: showDevframeInspector)', () => {
  const entries: DevToolsDockEntry[] = [
    iframe('a'),
    iframe(DEVTOOLS_INSPECTOR_DOCK_ID),
  ]

  it('hides the inspector from the dock bar by default', () => {
    const grouped = docksGroupByCategories(entries, settings)
    const ids = grouped.flatMap(([, items]) => items.map(i => i.id))
    expect(ids).toContain('a')
    expect(ids).not.toContain(DEVTOOLS_INSPECTOR_DOCK_ID)
  })

  it('reveals the inspector when showDevframeInspector is enabled', () => {
    const enabled = { ...settings, showDevframeInspector: true }
    const grouped = docksGroupByCategories(entries, enabled)
    const ids = grouped.flatMap(([, items]) => items.map(i => i.id))
    expect(ids).toContain(DEVTOOLS_INSPECTOR_DOCK_ID)
  })

  it('still lists the inspector in the settings management view (includeHidden)', () => {
    const grouped = docksGroupByCategories(entries, settings, { includeHidden: true })
    const ids = grouped.flatMap(([, items]) => items.map(i => i.id))
    expect(ids).toContain(DEVTOOLS_INSPECTOR_DOCK_ID)
  })
})

describe('resolveCommandIcon (dock icon → command icon projection)', () => {
  it('passes string icons through unchanged', () => {
    expect(resolveCommandIcon('logos:nuxt-icon')).toBe('logos:nuxt-icon')
  })

  it('collapses an object icon to its light variant (e.g. the Vite+ group)', () => {
    // Regression: object-form icons were dropped to `undefined`, so the Vite+
    // entry lost its icon in the command palette and Shortcuts settings.
    expect(resolveCommandIcon({ light: 'builtin:vite-plus-core', dark: 'builtin:vite-plus-core' }))
      .toBe('builtin:vite-plus-core')
    expect(resolveCommandIcon({ light: 'i-light', dark: 'i-dark' })).toBe('i-light')
  })

  it('falls back to dark when light is absent', () => {
    expect(resolveCommandIcon({ dark: 'i-dark' } as any)).toBe('i-dark')
  })
})
