import type { KitNodeContext } from '@vitejs/devtools-kit/node'
import { describe, expect, it } from 'vitest'
import { hideDockWhenEmpty } from '../auto-hide'

interface FakeView { id: string, type: string, url: string, title: string, when?: string }

function fakeCtx(views: FakeView[]): { ctx: KitNodeContext, get: (id: string) => FakeView } {
  const map = new Map(views.map(v => [v.id, v]))
  const ctx = { docks: { views: map } } as unknown as KitNodeContext
  return { ctx, get: id => map.get(id)! }
}

describe('hideDockWhenEmpty', () => {
  it('resolves `when` live from the isEmpty callback', () => {
    let empty = true
    const { ctx, get } = fakeCtx([{ id: 'x', type: 'iframe', url: '/', title: 'X' }])

    hideDockWhenEmpty(ctx, 'x', () => empty)

    // Hidden while empty, visible once populated — re-read on every access.
    expect(get('x').when).toBe('false')
    empty = false
    expect(get('x').when).toBeUndefined()
    empty = true
    expect(get('x').when).toBe('false')
  })

  it('attaches an enumerable `when` so it survives serialization', () => {
    const { ctx, get } = fakeCtx([{ id: 'x', type: 'iframe', url: '/', title: 'X' }])
    hideDockWhenEmpty(ctx, 'x', () => true)

    // Enumerable getters are picked up by JSON.stringify (the shared-state wire
    // format), so the resolved value reaches the client filter.
    expect(JSON.parse(JSON.stringify(get('x'))).when).toBe('false')
  })

  it('is a no-op when the dock id is not registered', () => {
    const { ctx } = fakeCtx([])
    expect(() => hideDockWhenEmpty(ctx, 'missing', () => true)).not.toThrow()
  })
})
