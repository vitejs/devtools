import type { ViteDevServer } from 'vite'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDevToolsContext } from '../context'
import { DevToolsServer } from '../plugins/server'
import { createDevToolsHub } from '../server'

vi.mock('../context', () => ({
  createDevToolsContext: vi.fn(),
}))

vi.mock('../server', () => ({
  createDevToolsHub: vi.fn(),
}))

describe('devToolsServer lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('closes the DevTools middleware with the Vite server', async () => {
    const close = vi.fn(async () => {})
    const middleware = vi.fn()
    vi.mocked(createDevToolsContext).mockResolvedValue({} as Awaited<ReturnType<typeof createDevToolsContext>>)
    vi.mocked(createDevToolsHub).mockResolvedValue({ close, middleware } as unknown as Awaited<ReturnType<typeof createDevToolsHub>>)

    const viteDevServer = {
      config: {
        root: process.cwd(),
        server: {},
      },
      middlewares: {
        use: vi.fn(),
      },
    } as unknown as ViteDevServer
    const plugin = DevToolsServer()

    const { closeBundle, configureServer } = plugin
    if (typeof configureServer !== 'function' || typeof closeBundle !== 'function')
      throw new TypeError('Expected DevTools server lifecycle hooks')

    await configureServer.call({} as never, viteDevServer)
    await closeBundle.call({} as never)

    expect(close).toHaveBeenCalledOnce()
  })
})
