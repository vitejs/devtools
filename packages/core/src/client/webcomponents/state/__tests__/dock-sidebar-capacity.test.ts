import type { DevToolsDockEntriesGrouped, DevToolsDockEntry } from '@vitejs/devtools-kit'
import { describe, expect, it } from 'vitest'
import { deriveSidebarCapacity, docksSplitGroupsWithCapacity } from '../dock-settings'

function iframe(id: string): DevToolsDockEntry {
  return { id, type: 'iframe', url: '/', title: id, icon: 'i' } as DevToolsDockEntry
}

// Rhythm constants mirroring DockGroupSidebar.vue.
const BASE = {
  reservedHeight: 53,
  itemHeight: 34,
  dividerHeight: 7,
  moreButtonHeight: 34,
  dividerCount: 0,
}

describe('deriveSidebarCapacity', () => {
  it('returns 0 when there are no members', () => {
    expect(deriveSidebarCapacity({ ...BASE, availableHeight: 1000, totalItems: 0 })).toBe(0)
  })

  it('returns the full count when every member fits without a show-more button', () => {
    // 53 reserved + 5 items * 34 = 223 → 230 leaves room for all 5, no button.
    expect(deriveSidebarCapacity({ ...BASE, availableHeight: 230, totalItems: 5 })).toBe(5)
  })

  it('reserves the show-more button slot only once overflow is unavoidable', () => {
    // budget = 200 - 53 = 147. Without button: floor(147/34) = 4 < 6 total → overflow.
    // With button reserved: floor((147 - 34)/34) = floor(113/34) = 3.
    expect(deriveSidebarCapacity({ ...BASE, availableHeight: 200, totalItems: 6 })).toBe(3)
  })

  it('never returns negative capacity when the frame is tiny', () => {
    expect(deriveSidebarCapacity({ ...BASE, availableHeight: 40, totalItems: 6 })).toBe(0)
  })

  it('subtracts sub-category divider height from the budget', () => {
    // budget = 300 - 53 - 2*7 = 233. Without button: floor(233/34) = 6 < 8 → overflow.
    // With button: floor((233 - 34)/34) = floor(199/34) = 5.
    expect(deriveSidebarCapacity({ ...BASE, availableHeight: 300, dividerCount: 2, totalItems: 8 })).toBe(5)
  })

  it('is a no-op split at full capacity (all visible, nothing overflowed)', () => {
    const groups: DevToolsDockEntriesGrouped = [['default', [iframe('a'), iframe('b')]]]
    const cap = deriveSidebarCapacity({ ...BASE, availableHeight: 500, totalItems: 2 })
    const { visible, overflow } = docksSplitGroupsWithCapacity(groups, cap)
    expect(visible).toEqual(groups)
    expect(overflow).toEqual([])
  })
})

describe('docksSplitGroupsWithCapacity (sidebar overflow)', () => {
  it('folds members beyond capacity into overflow, preserving order', () => {
    const groups: DevToolsDockEntriesGrouped = [['default', [iframe('a'), iframe('b'), iframe('c')]]]
    const { visible, overflow } = docksSplitGroupsWithCapacity(groups, 2)
    expect(visible).toEqual([['default', [iframe('a'), iframe('b')]]])
    expect(overflow).toEqual([['default', [iframe('c')]]])
  })

  it('splits across sub-categories once the first fills capacity', () => {
    const groups: DevToolsDockEntriesGrouped = [
      ['app', [iframe('a'), iframe('b')]],
      ['web', [iframe('c'), iframe('d')]],
    ]
    const { visible, overflow } = docksSplitGroupsWithCapacity(groups, 3)
    expect(visible).toEqual([['app', [iframe('a'), iframe('b')]], ['web', [iframe('c')]]])
    expect(overflow).toEqual([['web', [iframe('d')]]])
  })
})
