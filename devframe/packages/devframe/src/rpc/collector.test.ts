import { describe, expect, it, vi } from 'vitest'
import { RpcFunctionsCollectorBase } from './collector'

describe('agent gating (DF0019)', () => {
  it('rejects registration when agent is set without jsonSerializable: true', () => {
    const collector = new RpcFunctionsCollectorBase({})
    expect(() => collector.register({
      name: 'plugin:fn',
      agent: { description: 'x' },
      handler: () => 0,
    } as any)).toThrowError(/MCP requires JSON-serializable/)
  })

  it('rejects when agent + jsonSerializable: false', () => {
    const collector = new RpcFunctionsCollectorBase({})
    expect(() => collector.register({
      name: 'plugin:fn',
      agent: { description: 'x' },
      jsonSerializable: false,
      handler: () => 0,
    } as any)).toThrowError(/MCP requires JSON-serializable/)
  })

  it('accepts agent + jsonSerializable: true', () => {
    const collector = new RpcFunctionsCollectorBase({})
    expect(() => collector.register({
      name: 'plugin:fn',
      agent: { description: 'x' },
      jsonSerializable: true,
      handler: () => 0,
    } as any)).not.toThrow()
  })

  it('accepts jsonSerializable: false without agent (RPC-only)', () => {
    const collector = new RpcFunctionsCollectorBase({})
    expect(() => collector.register({
      name: 'plugin:fn',
      jsonSerializable: false,
      handler: () => 0,
    } as any)).not.toThrow()
  })

  it('also enforces the gate on update()', () => {
    const collector = new RpcFunctionsCollectorBase({})
    collector.register({ name: 'plugin:fn', handler: () => 0 } as any)
    expect(() => collector.update({
      name: 'plugin:fn',
      agent: { description: 'x' },
      handler: () => 0,
    } as any)).toThrowError(/MCP requires JSON-serializable/)
  })
})

it('collector', async () => {
  const context = {
    name: 'test',
  }
  const collector = new RpcFunctionsCollectorBase(context)

  expect(collector.functions).toMatchInlineSnapshot(`{}`)

  let _context: any
  collector.register({
    name: 'hello',
    type: 'static',
    setup: async (_c) => {
      await new Promise(resolve => setTimeout(resolve, 1))
      _context = _c
      return {
        handler: () => 100,
      }
    },
  })

  expect((await collector.getHandler('hello'))()).toBe(100)
  expect(_context).toBe(context)

  const onUpdate = vi.fn()
  const handler = vi.fn()
  collector.onChanged(onUpdate)
  collector.register({
    name: 'new',
    type: 'action',
    handler,
  })
  expect(onUpdate).toHaveBeenCalledWith('new')

  expect((await collector.getHandler('new'))()).toBe(undefined)
  expect(handler).toBeCalled()

  onUpdate.mockClear()
  handler.mockClear()
  collector.update({
    name: 'new',
    type: 'static',
    handler: () => 100,
  })
  expect(onUpdate).toHaveBeenCalledWith('new')
  expect((await collector.getHandler('new'))()).toBe(100)
  expect(handler).not.toBeCalled()
})
