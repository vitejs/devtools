import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ViteDevServer } from 'vite'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDevToolsHub } from '../server'

const initHub = vi.hoisted(() => vi.fn())

vi.mock('@devframes/hub/initiate', () => ({
  initHub,
}))

vi.mock('@devframes/json-render-ui/hub', () => ({
  jsonRenderUiRenderer: () => ({ type: 'json-render', file: '/builtin-json-render.mjs' }),
}))

vi.mock('../ui', () => ({
  createViteDevToolsUi: () => ({}),
}))

vi.mock('../auth-handler', () => ({
  getAuthHandler: () => ({ rpcFunctions: [] }),
  isClientAuthDisabled: () => false,
}))

function fakeContext(opts: { viteServer?: boolean } = {}): ViteDevToolsNodeContext {
  return {
    mode: 'dev',
    viteConfig: { devtools: undefined },
    viteServer: opts.viteServer ? ({} as ViteDevServer) : undefined,
    host: { provideConnectionMeta: vi.fn() },
  } as unknown as ViteDevToolsNodeContext
}

describe('createDevToolsHub client module resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initHub.mockReturnValue({
      ready: Promise.resolve(),
      connectionMeta: () => ({}),
      nodeMiddleware: vi.fn(),
      close: vi.fn(),
    })
  })

  it('advertises the Vite `/@id/` resolver when a live dev server backs the requests', async () => {
    await createDevToolsHub({ context: fakeContext({ viteServer: true }) })

    expect(initHub).toHaveBeenCalledOnce()
    expect(initHub.mock.calls[0]![0]).toMatchObject({
      clientModuleResolution: '/@id/{specifier}',
    })
  })

  it('leaves the resolver undeclared without a dev server (standalone / build)', async () => {
    await createDevToolsHub({ context: fakeContext({ viteServer: false }) })

    expect(initHub).toHaveBeenCalledOnce()
    expect(initHub.mock.calls[0]![0]).not.toHaveProperty('clientModuleResolution')
  })

  it('uses the built-in renderer list by default', async () => {
    expect.assertions(1)
    await createDevToolsHub({ context: fakeContext() })

    expect(initHub.mock.calls[0]![0].renderers).toEqual([
      { type: 'json-render', file: '/builtin-json-render.mjs' },
    ])
  })

  it('replaces matching built-ins and appends new configured renderers', async () => {
    expect.assertions(1)
    await createDevToolsHub({
      context: fakeContext(),
      renderers: [
        { type: 'json-render', file: '/replacement.mjs' },
        { type: 'custom-render', file: '/custom.mjs' },
      ],
    })

    expect(initHub.mock.calls[0]![0].renderers).toEqual([
      { type: 'json-render', file: '/replacement.mjs' },
      { type: 'custom-render', file: '/custom.mjs' },
    ])
  })
})
