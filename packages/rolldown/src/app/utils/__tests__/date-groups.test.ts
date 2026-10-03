import { DATE_GROUPS, getDateGroupKey, groupByDate } from '@vitejs/devtools-ui/utils/date-groups'
import { describe, expect, it } from 'vitest'

// Wednesday, 2024-06-12 12:00:00 local time
const NOW = new Date(2024, 5, 12, 12, 0, 0)

function at(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month, day, hour).getTime()
}

describe('getDateGroupKey', () => {
  it('buckets same-day timestamps as today', () => {
    expect(getDateGroupKey(at(2024, 5, 12, 0), NOW)).toBe('today')
    expect(getDateGroupKey(at(2024, 5, 12, 23), NOW)).toBe('today')
  })

  it('buckets earlier-this-week timestamps as week', () => {
    // Sunday 2024-06-09 is the start of this calendar week
    expect(getDateGroupKey(at(2024, 5, 9), NOW)).toBe('week')
    expect(getDateGroupKey(at(2024, 5, 11), NOW)).toBe('week')
  })

  it('buckets earlier-this-month timestamps as month', () => {
    expect(getDateGroupKey(at(2024, 5, 1), NOW)).toBe('month')
    expect(getDateGroupKey(at(2024, 5, 8), NOW)).toBe('month')
  })

  it('buckets anything before this month as older', () => {
    expect(getDateGroupKey(at(2024, 4, 31), NOW)).toBe('older')
    expect(getDateGroupKey(at(2023, 0, 1), NOW)).toBe('older')
  })
})

describe('groupByDate', () => {
  it('groups items and skips empty groups, preserving DATE_GROUPS order', () => {
    const items = [
      { id: 'a', timestamp: at(2024, 5, 12) }, // today
      { id: 'b', timestamp: at(2023, 0, 1) }, // older
      { id: 'c', timestamp: at(2024, 5, 9) }, // week
    ]

    const groups = groupByDate(items, item => item.timestamp, NOW)

    expect(groups.map(g => g.key)).toEqual(['today', 'week', 'older'])
    expect(groups.find(g => g.key === 'today')?.items.map(i => i.id)).toEqual(['a'])
    expect(groups.find(g => g.key === 'week')?.items.map(i => i.id)).toEqual(['c'])
    expect(groups.find(g => g.key === 'older')?.items.map(i => i.id)).toEqual(['b'])
  })

  it('preserves incoming order within a group', () => {
    const items = [
      { id: 'a', timestamp: at(2024, 5, 12, 8) },
      { id: 'b', timestamp: at(2024, 5, 12, 20) },
      { id: 'c', timestamp: at(2024, 5, 12, 14) },
    ]

    const [group] = groupByDate(items, item => item.timestamp, NOW)
    expect(group!.items.map(i => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns no groups for an empty list', () => {
    expect(groupByDate([], () => 0, NOW)).toEqual([])
  })

  it('exposes default-open state matching DATE_GROUPS', () => {
    const items = [{ id: 'a', timestamp: at(2023, 0, 1) }]
    const [group] = groupByDate(items, item => item.timestamp, NOW)
    expect(group!.defaultOpen).toBe(DATE_GROUPS.find(g => g.key === 'older')!.defaultOpen)
  })
})
