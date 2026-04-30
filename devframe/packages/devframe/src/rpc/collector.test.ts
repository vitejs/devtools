import { expect, it, vi } from 'vitest'
import { RpcFunctionsCollectorBase } from './collector'

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
