import type { RpcFunctionDefinitionAnyWithContext } from '../../rpc/types'
import type { DevToolsNodeContext } from '../../types/context'
import { describe, expect, it, vi } from 'vitest'
import { DevToolsAgentHost } from '../host-agent'
import { RpcFunctionsHost } from '../host-functions'

function createContext(): DevToolsNodeContext {
  const ctx = {} as DevToolsNodeContext
  ctx.rpc = new RpcFunctionsHost(ctx)
  ctx.agent = new DevToolsAgentHost(ctx)
  return ctx
}

function rpcDef(def: RpcFunctionDefinitionAnyWithContext<DevToolsNodeContext>): RpcFunctionDefinitionAnyWithContext<DevToolsNodeContext> {
  return def
}

describe('devToolsAgentHost', () => {
  describe('registerTool()', () => {
    it('stores a tool and exposes it via list()', () => {
      const ctx = createContext()
      const handler = vi.fn(async () => 'result')
      ctx.agent.registerTool({
        id: 'my-tool',
        description: 'Does a thing.',
        handler,
      })

      const tools = ctx.agent.list().tools
      expect(tools).toHaveLength(1)
      expect(tools[0]).toMatchObject({
        id: 'my-tool',
        kind: 'tool',
        title: 'my-tool',
        description: 'Does a thing.',
        safety: 'action',
      })
    })

    it('emits agent:tool:registered and agent:manifest:changed', () => {
      const ctx = createContext()
      const toolHandler = vi.fn()
      const manifestHandler = vi.fn()
      ctx.agent.events.on('agent:tool:registered', toolHandler)
      ctx.agent.events.on('agent:manifest:changed', manifestHandler)

      ctx.agent.registerTool({
        id: 'my-tool',
        description: 'Does a thing.',
        handler: async () => 'ok',
      })

      expect(toolHandler).toHaveBeenCalledOnce()
      expect(manifestHandler).toHaveBeenCalledOnce()
    })

    it('throws DF0014 on empty description', () => {
      const ctx = createContext()
      expect(() => ctx.agent.registerTool({
        id: 'bad-tool',
        description: '',
        handler: async () => {},
      })).toThrow(/bad-tool/)
    })

    it('throws DF0015 on duplicate id', () => {
      const ctx = createContext()
      ctx.agent.registerTool({
        id: 'dup',
        description: 'First.',
        handler: async () => {},
      })
      expect(() => ctx.agent.registerTool({
        id: 'dup',
        description: 'Second.',
        handler: async () => {},
      })).toThrow(/already registered/)
    })

    it('throws DF0015 when colliding with an agent-exposed RPC', () => {
      const ctx = createContext()
      ctx.rpc.register(rpcDef({
        name: 'shared-id',
        type: 'query',
        agent: { description: 'An RPC' },
        setup: () => ({ handler: async () => 'rpc' }),
      }))

      expect(() => ctx.agent.registerTool({
        id: 'shared-id',
        description: 'Tool',
        handler: async () => {},
      })).toThrow(/already registered/)
    })

    it('unregister removes the tool and emits events', () => {
      const ctx = createContext()
      const unregisterHandler = vi.fn()
      ctx.agent.events.on('agent:tool:unregistered', unregisterHandler)

      const handle = ctx.agent.registerTool({
        id: 'ephemeral',
        description: 'Goes away.',
        handler: async () => {},
      })
      handle.unregister()

      expect(ctx.agent.list().tools).toHaveLength(0)
      expect(unregisterHandler).toHaveBeenCalledWith('ephemeral')
    })
  })

  describe('list() RPC auto-discovery', () => {
    it('surfaces RPC functions flagged with agent as tools', () => {
      const ctx = createContext()
      ctx.rpc.register(rpcDef({
        name: 'exposed-rpc',
        type: 'query',
        agent: {
          description: 'An exposed RPC.',
          title: 'Exposed',
        },
        setup: () => ({ handler: async () => 42 }),
      }))

      const tools = ctx.agent.list().tools
      expect(tools).toHaveLength(1)
      expect(tools[0]).toMatchObject({
        id: 'exposed-rpc',
        kind: 'rpc',
        title: 'Exposed',
        description: 'An exposed RPC.',
        safety: 'read',
        rpcName: 'exposed-rpc',
      })
    })

    it('does not surface RPC functions without agent field', () => {
      const ctx = createContext()
      ctx.rpc.register(rpcDef({
        name: 'private-rpc',
        type: 'query',
        setup: () => ({ handler: async () => 42 }),
      }))

      expect(ctx.agent.list().tools).toHaveLength(0)
    })

    it('infers safety from RPC type', () => {
      const ctx = createContext()
      ctx.rpc.register(rpcDef({
        name: 'q',
        type: 'query',
        agent: { description: 'q' },
        setup: () => ({ handler: async () => {} }),
      }))
      ctx.rpc.register(rpcDef({
        name: 'a',
        type: 'action',
        agent: { description: 'a' },
        setup: () => ({ handler: async () => {} }),
      }))
      ctx.rpc.register(rpcDef({
        name: 's',
        type: 'static',
        agent: { description: 's' },
        setup: () => ({ handler: async () => {} }),
      }))

      const tools = ctx.agent.list().tools
      const byId = Object.fromEntries(tools.map(t => [t.id, t]))
      expect(byId.q!.safety).toBe('read')
      expect(byId.a!.safety).toBe('action')
      expect(byId.s!.safety).toBe('read')
    })

    it('fires manifest:changed when a new agent RPC is registered', () => {
      const ctx = createContext()
      const handler = vi.fn()
      ctx.agent.events.on('agent:manifest:changed', handler)

      ctx.rpc.register(rpcDef({
        name: 'x',
        type: 'query',
        agent: { description: 'x' },
        setup: () => ({ handler: async () => {} }),
      }))

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('invoke()', () => {
    it('dispatches to the registered tool handler', async () => {
      const ctx = createContext()
      const handler = vi.fn(async (args: unknown) => ({ echoed: args }))
      ctx.agent.registerTool({
        id: 'echo',
        description: 'Echoes input.',
        handler,
      })

      const result = await ctx.agent.invoke('echo', { ping: true })
      expect(handler).toHaveBeenCalledWith({ ping: true })
      expect(result).toEqual({ echoed: { ping: true } })
    })

    it('dispatches to an RPC function via invokeLocal', async () => {
      const ctx = createContext()
      ctx.rpc.register(rpcDef({
        name: 'my-rpc',
        type: 'query',
        agent: { description: 'rpc' },
        setup: () => ({
          handler: async (a: number, b: number) => a + b,
        }),
      }))

      const result = await ctx.agent.invoke('my-rpc', { arg0: 2, arg1: 3 })
      expect(result).toBe(5)
    })

    it('throws for unknown tool id', async () => {
      const ctx = createContext()
      await expect(ctx.agent.invoke('missing', {})).rejects.toThrow(/missing/)
    })
  })

  describe('resources', () => {
    it('registerResource synthesizes URI and stores the read handler', async () => {
      const ctx = createContext()
      ctx.agent.registerResource({
        id: 'my-resource',
        name: 'My resource',
        read: () => ({ json: { hello: 'world' } }),
      })

      const resources = ctx.agent.list().resources
      expect(resources).toHaveLength(1)
      expect(resources[0]!.uri).toBe('devframe://resource/my-resource')

      const content = await ctx.agent.read('my-resource')
      expect(content).toEqual({ json: { hello: 'world' } })
    })

    it('throws DF0016 on duplicate id', () => {
      const ctx = createContext()
      ctx.agent.registerResource({
        id: 'dup',
        name: 'first',
        read: () => ({ text: 'a' }),
      })
      expect(() => ctx.agent.registerResource({
        id: 'dup',
        name: 'second',
        read: () => ({ text: 'b' }),
      })).toThrow(/already registered/)
    })

    it('throws when reading unknown resource', async () => {
      const ctx = createContext()
      await expect(ctx.agent.read('ghost')).rejects.toThrow(/ghost/)
    })
  })
})
