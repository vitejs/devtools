import type { DevToolsNodeContext, RpcFunctionDefinition } from '@vitejs/devtools-kit'
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
      const fn: RpcFunctionDefinition<string, any, any, any> = {
        name: 'test-function',
        type: 'action',
        setup: setupWith(emptyHandler),
      }

      expect(() => host.register(fn)).not.toThrow()
      expect(host.definitions.has('test-function')).toBe(true)
    })

    it('should throw error when registering duplicate RPC function ID', () => {
      const host = new RpcFunctionsHost(mockContext)
      const fn1: RpcFunctionDefinition<string, any, any, any> = {
        name: 'duplicate-fn',
        type: 'action',
        setup: setupWith(returnFirst),
      }
      const fn2: RpcFunctionDefinition<string, any, any, any> = {
        name: 'duplicate-fn',
        type: 'action',
        setup: setupWith(returnSecond),
      }

      host.register(fn1)

      const registerDuplicate = () => host.register(fn2)
      expect(registerDuplicate).toThrow()
      expect(registerDuplicate).toThrow('duplicate-fn')
      expect(registerDuplicate).toThrow('already registered')
    })

    it('should include the duplicate ID in error message', () => {
      const host = new RpcFunctionsHost(mockContext)
      const fn: RpcFunctionDefinition<string, any, any, any> = {
        name: 'my-special-function',
        type: 'query',
        setup: setupWith(emptyHandler),
      }

      host.register(fn)

      const registerAgain = () => host.register(fn)
      expect(registerAgain).toThrow('my-special-function')
    })
  })

  describe('update() existence validation', () => {
    it('should throw error when updating non-existent RPC function', () => {
      const host = new RpcFunctionsHost(mockContext)
      const fn: RpcFunctionDefinition<string, any, any, any> = {
        name: 'nonexistent',
        type: 'action',
        setup: setupWith(emptyHandler),
      }

      const updateNonexistent = () => host.update(fn)
      expect(updateNonexistent).toThrow()
      expect(updateNonexistent).toThrow('nonexistent')
      expect(updateNonexistent).toThrow('not registered')
      expect(updateNonexistent).toThrow('Use register()')
    })

    it('should update existing RPC function successfully', () => {
      const host = new RpcFunctionsHost(mockContext)
      const fn1: RpcFunctionDefinition<string, any, any, any> = {
        name: 'update-test',
        type: 'action',
        setup: setupWith(returnV1),
      }
      const fn2: RpcFunctionDefinition<string, any, any, any> = {
        name: 'update-test',
        type: 'action',
        setup: setupWith(returnV2),
      }

      host.register(fn1)
      const doUpdate = () => host.update(fn2)
      expect(doUpdate).not.toThrow()

      const updated = host.definitions.get('update-test')
      expect(updated).toBe(fn2)
    })

    it('should validate that update only works on existing entries', () => {
      const host = new RpcFunctionsHost(mockContext)

      // Register one function
      host.register({
        name: 'exists',
        type: 'action',
        setup: setupWith(emptyHandler),
      })

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
})
