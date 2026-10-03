import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ResolvedConfig, ViteDevServer } from 'vite'
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
