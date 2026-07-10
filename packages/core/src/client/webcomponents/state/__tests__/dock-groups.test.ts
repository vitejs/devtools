import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { DEFAULT_STATE_USER_SETTINGS, DEVTOOLS_INSPECTOR_DOCK_ID } from '@vitejs/devtools-kit/constants'
import { describe, expect, it } from 'vitest'
import {
  docksGroupByCategories,
  getEntryGroup,
  getGroupMembers,
  getRegisteredGroupIds,
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
