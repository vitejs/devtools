import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeDevToolsConfig } from '../config'
import { setResolvedDevToolsConfig } from '../resolved-config'
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
  isBuildCapabilityAuth: () => false,
  getBuildCapabilityToken: () => 'test-capability-token',
}))

function fakeContext(mcp?: boolean): ViteDevToolsNodeContext {
  const context = {
    mode: 'dev',
    viteConfig: { devtools: undefined },
    host: { provideConnectionMeta: vi.fn() },
  } as unknown as ViteDevToolsNodeContext
  setResolvedDevToolsConfig(
    context,
    normalizeDevToolsConfig(mcp === undefined ? true : { mcp }, 'localhost'),
  )
  return context
}

describe('createDevToolsHub mcp forwarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initHub.mockReturnValue({
      ready: Promise.resolve(),
      connectionMeta: () => ({}),
      nodeMiddleware: vi.fn(),
      close: vi.fn(),
    })
  })

  it('forwards an explicit `mcp: false` opt-out to initHub', async () => {
    await createDevToolsHub({ context: fakeContext(false) })

    expect(initHub.mock.calls[0]![0].mcp).toBe(false)
  })

  it('leaves `mcp` undeclared by default so the hub keeps its auto-mount', async () => {
    await createDevToolsHub({ context: fakeContext() })

    expect(initHub.mock.calls[0]![0]).not.toHaveProperty('mcp')
  })
})
