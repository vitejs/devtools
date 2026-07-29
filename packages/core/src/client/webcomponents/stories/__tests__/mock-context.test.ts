import { describe, expect, it, vi } from 'vitest'
import { docksSplitGroupsWithCapacity } from '../../state/dock-settings'
import { categorizedEntries, groupedEntries, overflowEntries } from '../fixtures'
import { createMockDocksContext } from '../mock-context'

describe('story mock context', () => {
  it('boots a dock context over the in-memory rpc', async () => {
    const ctx = await createMockDocksContext({ entries: categorizedEntries })
    expect(ctx.clientType).toBe('embedded')
    expect(ctx.docks.entries.map(e => e.id)).toContain('overview')
    // categories are grouped and ordered
    expect(ctx.docks.groupedEntries.length).toBeGreaterThan(1)
  })

  it('collapses group members behind the group button on the bar', async () => {
    const ctx = await createMockDocksContext({ entries: groupedEntries })
    const barIds = ctx.docks.groupedEntries.flatMap(([, items]) => items.map(i => i.id))
    expect(barIds).toContain('nuxt')
    expect(barIds).not.toContain('nuxt:overview')
  })

  it('pre-selects an entry and opens the panel', async () => {
    const ctx = await createMockDocksContext({ entries: groupedEntries, selectedId: 'nuxt:pages' })
    expect(ctx.docks.selectedId).toBe('nuxt:pages')
    expect(ctx.docks.selected?.id).toBe('nuxt:pages')
    expect(ctx.panel.store.open).toBe(true)
  })

  it('honours panel overrides', async () => {
    const ctx = await createMockDocksContext({ panel: { mode: 'edge', position: 'right' } })
    expect(ctx.panel.store.mode).toBe('edge')
    expect(ctx.panel.store.position).toBe('right')
    expect(ctx.panel.isVertical).toBe(true)
  })

  it('exposes a mutable trust flag that emits on change', async () => {
    const ctx = await createMockDocksContext({ isTrusted: false })
    expect(ctx.rpc.isTrusted).toBe(false)

    const seen = vi.fn()
    ctx.rpc.events.on('rpc:is-trusted:updated', seen)
    ctx.rpc.setTrusted(true)

    expect(ctx.rpc.isTrusted).toBe(true)
    expect(seen).toHaveBeenCalledWith(true)
  })

  it('overflows the bar past capacity', async () => {
    const ctx = await createMockDocksContext({ entries: overflowEntries })
    const { visible, overflow } = docksSplitGroupsWithCapacity(ctx.docks.groupedEntries, 5)
    expect(visible.flatMap(([, i]) => i).length).toBe(5)
    expect(overflow.flatMap(([, i]) => i).length).toBeGreaterThan(0)
  })
})
