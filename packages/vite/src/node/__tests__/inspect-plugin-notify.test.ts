import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { EnvironmentModuleNode, ResolvedConfig, ViteDevServer } from 'vite'
import type { ViteInspectModuleUpdatedState } from '../rpc/inspect-module-updated'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getViteInspectContext } from '../inspect/context'
import { DevToolsViteInspect } from '../inspect/plugin'

type ConnectMiddleware = (req: unknown, res: unknown, next: () => void) => void

describe('vite:inspect:module-updated notifications', () => {
  let cleanupCtx: ViteDevToolsNodeContext | undefined

  afterEach(async () => {
    vi.useRealTimers()
    if (cleanupCtx)
      await getViteInspectContext(cleanupCtx).close()
    cleanupCtx = undefined
  })

  it('registers HMR RPCs backed by the inspector hot-update hook', async () => {
    const plugin = DevToolsViteInspect()
    await Reflect.apply(plugin.configResolved as (config: ResolvedConfig) => void | Promise<void>, {}, [{
      root: process.cwd(),
      command: 'build',
    } as ResolvedConfig])
    const register = vi.fn()
    const ctx = {
      diagnostics: { register: vi.fn() },
      rpc: { register },
    } as unknown as ViteDevToolsNodeContext
    await plugin.devtools!.setup!(ctx)

    const id = `${process.cwd()}/src/hmr-example.ts`
    await Reflect.apply(plugin.hotUpdate as (options: unknown) => unknown, {}, [{
      type: 'update',
      file: id,
      timestamp: 1000,
      modules: [{
        id,
        url: '/src/hmr-example.ts',
        type: 'js',
        isSelfAccepting: true,
        importers: new Set(),
        acceptedHmrDeps: new Set(),
      } as EnvironmentModuleNode],
    }])

    const definitions = register.mock.calls.map(([definition]) => definition)
    const updates = definitions.find(definition => definition.name === 'vite:hmr-updates').setup(ctx)
    const clear = definitions.find(definition => definition.name === 'vite:hmr-clear').setup(ctx)
    expect(await updates.handler()).toMatchObject([{
      timestamp: 1000,
      boundaries: ['src/hmr-example.ts'],
    }])
    await clear.handler()
    expect(await updates.handler()).toEqual([])
  })

  it('notifies subscribers on watcher events and requests', async () => {
    const plugin = DevToolsViteInspect()
    const config = {
      root: process.cwd(),
      command: 'serve',
      plugins: [plugin],
      environments: {
        client: {},
      },
      createResolver: () => async (id: string) => id,
    } as unknown as ResolvedConfig

    await (plugin.configResolved as (config: ResolvedConfig) => void | Promise<void>)(config)

    const watcher = new EventEmitter()
    const middlewares: ConnectMiddleware[] = []
    const stateValue: ViteInspectModuleUpdatedState = {
      ids: null,
      updatedAt: 0,
    }
    const mutate = vi.fn((update: (state: ViteInspectModuleUpdatedState) => void) => update(stateValue))
    const ctx = {
      diagnostics: { register: vi.fn() },
      rpc: {
        register: vi.fn(),
        sharedState: { get: vi.fn(async () => ({ mutate })) },
      },
      viteServer: {
        watcher,
        middlewares: { use: (fn: ConnectMiddleware) => middlewares.push(fn) },
      } as unknown as ViteDevServer,
    } as unknown as ViteDevToolsNodeContext

    await plugin.devtools!.setup!(ctx)
    cleanupCtx = ctx

    expect(middlewares).toHaveLength(1)

    vi.useFakeTimers()

    watcher.emit('all', 'change', '/src/main.ts')
    await vi.advanceTimersByTimeAsync(150)
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(stateValue.updatedAt).toBeGreaterThan(0)

    watcher.emit('all', 'add', '/src/other.ts')
    watcher.emit('all', 'unlink', '/src/other.ts')
    await vi.advanceTimersByTimeAsync(150)
    expect(mutate).toHaveBeenCalledTimes(2)

    const next = vi.fn()
    middlewares[0]!({}, {}, next)
    expect(next).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(150)
    expect(mutate).toHaveBeenCalledTimes(3)
  })
})
