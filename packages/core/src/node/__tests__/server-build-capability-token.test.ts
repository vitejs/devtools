import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDevToolsHub } from '../server'

const initHub = vi.hoisted(() => vi.fn())
const hubMiddleware = vi.hoisted(() => vi.fn())

vi.mock('@devframes/hub/initiate', () => ({
  initHub,
}))

vi.mock('@devframes/json-render-ui/hub', () => ({
  jsonRenderUiRenderer: () => ({ type: 'json-render', file: '/builtin-json-render.mjs' }),
}))

vi.mock('../ui', () => ({
  createViteDevToolsUi: () => ({}),
}))

const CAPABILITY_TOKEN = 'build-capability-token'

vi.mock('../auth-handler', () => ({
  getAuthHandler: () => ({ rpcFunctions: [] }),
  isClientAuthDisabled: () => false,
  isBuildCapabilityAuth: () => true,
  getBuildCapabilityToken: () => CAPABILITY_TOKEN,
}))

function fakeContext(): ViteDevToolsNodeContext {
  return {
    mode: 'build',
    viteConfig: { devtools: undefined },
    viteServer: undefined,
    host: { provideConnectionMeta: vi.fn() },
  } as unknown as ViteDevToolsNodeContext
}

function fakeRes(): ServerResponse & { body?: string, headers: Record<string, string> } {
  const headers: Record<string, string> = {}
  return {
    headers,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name.toLowerCase()] = value
    }),
    end: vi.fn(function (this: any, chunk?: string) {
      this.body = chunk
    }),
  } as unknown as ServerResponse & { body?: string, headers: Record<string, string> }
}

describe('createDevToolsHub build-mode capability token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initHub.mockReturnValue({
      ready: Promise.resolve(),
      connectionMeta: () => ({ backend: 'websocket', websocket: { path: '__ws' } }),
      nodeMiddleware: hubMiddleware,
      close: vi.fn(),
    })
  })

  it('installs the real auth handler rather than the auto-trust shim', async () => {
    await createDevToolsHub({ context: fakeContext() })

    expect(initHub.mock.calls[0]![0].auth).not.toBe(false)
  })

  it('bakes the capability token into the emitted connection meta', async () => {
    const { getConnectionMeta } = await createDevToolsHub({ context: fakeContext() })

    expect(getConnectionMeta()).toMatchObject({
      backend: 'websocket',
      authToken: CAPABILITY_TOKEN,
    })
  })

  it('intercepts the top-level connection meta route with the token-augmented meta', async () => {
    const { middleware } = await createDevToolsHub({ context: fakeContext() })

    const res = fakeRes()
    const next = vi.fn()
    middleware({ url: '/__devtools/__connection.json' } as IncomingMessage, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(hubMiddleware).not.toHaveBeenCalled()
    expect(res.headers['content-type']).toBe('application/json')
    expect(JSON.parse(res.body!)).toMatchObject({ authToken: CAPABILITY_TOKEN })
  })

  it('delegates every other route to the hub middleware', async () => {
    const { middleware } = await createDevToolsHub({ context: fakeContext() })

    const res = fakeRes()
    const next = vi.fn()
    middleware({ url: '/__devtools/index.html' } as IncomingMessage, res, next)

    expect(hubMiddleware).toHaveBeenCalledOnce()
    expect(res.end).not.toHaveBeenCalled()
  })
})
