import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { describe, expect, it } from 'vitest'
import { RpcFunctionsHost } from '../host-functions'

async function emptyHandler() { /* empty */ }
const returnFirst = async () => 'first'
const returnSecond = async () => 'second'
const returnV1 = async () => 'v1'
const returnV2 = async () => 'v2'
const setupWith = <T>(handler: () => Promise<T>) => async () => ({ handler })

describe('rpcFunctionsHost', () => {
  const mockContext = {} as DevToolsNodeContext

  describe('register() collision detection', () => {
    it('should register a new RPC function successfully', () => {
      const host = new RpcFunctionsHost(mockContext)
      const fn = defineRpcFunction({
        name: 'test-function',
        type: 'action',
        setup: setupWith(emptyHandler),
      })

      expect(() => host.register(fn)).not.toThrow()
      expect(host.definitions.has('test-function')).toBe(true)
    })

    it('should throw error when registering duplicate RPC function ID', () => {
      const host = new RpcFunctionsHost(mockContext)
      const fn1 = defineRpcFunction({
        name: 'duplicate-fn',
        type: 'action',
        setup: setupWith(returnFirst),
      })
      const fn2 = defineRpcFunction({
        name: 'duplicate-fn',
        type: 'action',
        setup: setupWith(returnSecond),
      })

      host.register(fn1)

      const registerDuplicate = () => host.register(fn2)
      expect(registerDuplicate).toThrow()
      expect(registerDuplicate).toThrow('duplicate-fn')
      expect(registerDuplicate).toThrow('already registered')
    })

    it('should include the duplicate ID in error message', () => {
      const host = new RpcFunctionsHost(mockContext)
      const fn = defineRpcFunction({
        name: 'my-special-function',
        type: 'query',
        setup: setupWith(emptyHandler),
      })

      host.register(fn)

      const registerAgain = () => host.register(fn)
      expect(registerAgain).toThrow('my-special-function')
    })
  })

  describe('update() existence validation', () => {
    it('should throw error when updating non-existent RPC function', () => {
      const host = new RpcFunctionsHost(mockContext)
      const fn = defineRpcFunction({
        name: 'nonexistent',
        type: 'action',
        setup: setupWith(emptyHandler),
      })

      const updateNonexistent = () => host.update(fn)
      expect(updateNonexistent).toThrow()
      expect(updateNonexistent).toThrow('nonexistent')
      expect(updateNonexistent).toThrow('not registered')
      expect(updateNonexistent).toThrow('Use register()')
    })

    it('should update existing RPC function successfully', () => {
      const host = new RpcFunctionsHost(mockContext)
      const fn1 = defineRpcFunction({
        name: 'update-test',
        type: 'action',
        setup: setupWith(returnV1),
      })
      const fn2 = defineRpcFunction({
        name: 'update-test',
        type: 'action',
        setup: setupWith(returnV2),
      })

      host.register(fn1)
      const doUpdate = () => host.update(fn2)
      expect(doUpdate).not.toThrow()

      const updated = host.definitions.get('update-test')
      expect(updated).toBe(fn2)
    })

    it('should validate that update only works on existing entries', () => {
      const host = new RpcFunctionsHost(mockContext)

      // Register one function
      host.register(defineRpcFunction({
        name: 'exists',
        type: 'action',
        setup: setupWith(emptyHandler),
      }))

      // Update should work for existing
      const updateExisting = () =>
        host.update({
          name: 'exists',
          type: 'action',
          setup: setupWith(emptyHandler),
        })
      expect(updateExisting).not.toThrow()

      // Update should fail for non-existing
      const updateMissing = () =>
        host.update({
          name: 'does-not-exist',
          type: 'action',
          setup: setupWith(emptyHandler),
        })
      expect(updateMissing).toThrow()
    })
  })

  describe('broadcast() without rpc group', () => {
    it('should not throw in build mode', async () => {
      const host = new RpcFunctionsHost({ mode: 'build' } as DevToolsNodeContext)
      await expect(host.broadcast({
        method: 'devtoolskit:internal:terminals:updated',
        args: [],
      })).resolves.toBeUndefined()
    })

    it('should throw in dev mode', async () => {
      const host = new RpcFunctionsHost({ mode: 'dev' } as DevToolsNodeContext)
      await expect(host.broadcast({
        method: 'devtoolskit:internal:terminals:updated',
        args: [],
      })).rejects.toThrow('RpcFunctionsHost] RpcGroup is not set')
    })
  })

  describe('invokeLocal()', () => {
    it('should invoke a locally registered function', async () => {
      const host = new RpcFunctionsHost(mockContext)
      host.register(defineRpcFunction({
        name: 'test:invoke-local',
        type: 'query',
        setup: () => ({
          handler: async (a: number, b: number) => a + b,
        }),
      }))

      await expect(host.invokeLocal('test:invoke-local' as any, 2, 3)).resolves.toBe(5)
    })

    it('should throw when invoking a missing local function', async () => {
      const host = new RpcFunctionsHost(mockContext)
      await expect(host.invokeLocal('test:missing' as any)).rejects.toThrow('RPC function "test:missing" is not registered')
    })
  })
})
