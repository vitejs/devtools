import { describe, expect, it } from 'vitest'
import { DEFAULT_DOCK_LAYOUT, resolveDockLayout } from '../dock-layout'

describe('resolveDockLayout', () => {
  it('returns the defaults untouched without overrides', () => {
    expect.assertions(1)
    expect(resolveDockLayout()).toBe(DEFAULT_DOCK_LAYOUT)
  })

  it('ignores an undefined maxVisibleItems override', () => {
    expect.assertions(1)
    expect(resolveDockLayout({ maxVisibleItems: undefined }).maxVisibleItems).toBe(DEFAULT_DOCK_LAYOUT.maxVisibleItems)
  })

  it('clamps maxVisibleItems to at least one', () => {
    expect.assertions(2)
    expect(resolveDockLayout({ maxVisibleItems: 0 }).maxVisibleItems).toBe(1)
    expect(resolveDockLayout({ maxVisibleItems: 10 }).maxVisibleItems).toBe(10)
  })
})
