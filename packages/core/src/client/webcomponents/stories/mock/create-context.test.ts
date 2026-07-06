import { describe, expect, it } from 'vitest'
import { createMockDocksContext } from './create-context'
import { dockEntriesFixture } from './fixtures'
import { jsonRenderSpecFixture } from './json-render-spec'

describe('createMockDocksContext', () => {
  it('builds a context seeded with fixture entries and commands', async () => {
    const { context } = await createMockDocksContext()

    expect(context.clientType).toBe('embedded')
    expect(context.docks.entries.length).toBeGreaterThan(0)
    expect(context.docks.entries.find(e => e.id === 'overview')).toBeTruthy()

    // Server command fixtures merged with the client commands the context seeds.
    const commandIds = context.commands.commands.map(c => c.id)
    expect(commandIds).toContain('vite:restart')
    expect(commandIds).toContain('devtools:toggle-palette')
  })

  it('selects an iframe entry and opens the panel', async () => {
    const { context } = await createMockDocksContext({ selectedId: 'overview' })
    expect(context.docks.selectedId).toBe('overview')
    expect(context.panel.store.open).toBe(true)
  })

  it('resolves a group entry to its default child', async () => {
    const { context } = await createMockDocksContext()
    const switched = await context.docks.switchEntry('nuxt')
    expect(switched).toBe(true)
    expect(context.docks.selectedId).toBe('nuxt:overview')
  })

  it('honors the untrusted flag', async () => {
    const { context } = await createMockDocksContext({ isTrusted: false })
    expect(context.rpc.isTrusted).toBe(false)
  })

  it('seeds extra shared state for json-render views', async () => {
    const { rpc } = await createMockDocksContext({
      entries: dockEntriesFixture(),
      sharedStates: { 'story:json-render': jsonRenderSpecFixture() },
    })
    const state = await rpc.sharedState.get('story:json-render' as any)
    expect((state.value() as any).root).toBe('root')
  })
})
