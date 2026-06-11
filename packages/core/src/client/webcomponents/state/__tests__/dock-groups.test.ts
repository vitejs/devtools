import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import { DEFAULT_STATE_USER_SETTINGS } from '@vitejs/devtools-kit/constants'
import { describe, expect, it } from 'vitest'
import {
  docksGroupByCategories,
  getEntryGroup,
  getGroupMembers,
  getRegisteredGroupIds,
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
})
