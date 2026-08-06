import type { DevToolsDockConfig } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient, DockPanelStorage } from '@vitejs/devtools-kit/client'
import type { Ref } from 'vue'
import { createSharedState } from 'devframe/utils/shared-state'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { seedWindowDefaultsOnce, startDevTools } from './runtime'

const mocks = vi.hoisted(() => ({
  getDevToolsRpcClient: vi.fn(
    (_options: { baseURL: string[] }) => new Promise(() => {}),
  ),
}))

vi.mock('@vitejs/devtools-kit/client', () => ({
  CLIENT_CONTEXT_KEY: '__VITE_DEVTOOLS_CLIENT_CONTEXT__',
  getDevToolsRpcClient: mocks.getDevToolsRpcClient,
}))

vi.mock('@vueuse/core', () => ({
  useLocalStorage: vi.fn(),
}))

vi.mock('../webcomponents/state/context', () => ({
  createDocksContext: vi.fn(),
}))

describe('injected DevTools runtime', () => {
  beforeEach(() => {
    const hostWindow = {
      addEventListener: vi.fn(),
    } as unknown as Window
    Object.defineProperty(hostWindow, 'parent', { value: hostWindow })
    vi.stubGlobal('window', hostWindow)

    startDevTools('normal')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mocks.getDevToolsRpcClient.mockClear()
  })

  it('preserves the host-relative mount path as the primary base', () => {
    const options = mocks.getDevToolsRpcClient.mock.calls[0]![0]

    expect(options.baseURL).toHaveLength(2)
    expect(options.baseURL[0]).toBe('/__devtools/')
  })

  it('adds the Vite module origin as the fallback base', () => {
    const options = mocks.getDevToolsRpcClient.mock.calls[0]![0]

    expect(options.baseURL[1]).toBe(
      new URL('/__devtools/', import.meta.url).href,
    )
  })
})

describe('seedWindowDefaultsOnce', () => {
  function mockRpc(initialValue: DevToolsDockConfig) {
    const state = createSharedState({ initialValue, enablePatches: false })
    return {
      sharedState: {
        get: async () => state,
      },
    } as unknown as DevToolsRpcClient
  }

  function panelState(): Ref<DockPanelStorage> {
    return ref<DockPanelStorage>({
      mode: 'float',
      width: 80,
      height: 80,
      top: 0,
      left: 0,
      position: 'left',
      open: false,
      inactiveTimeout: 3_000,
    })
  }

  it('applies an already-available default mode and position', async () => {
    const state = panelState()
    await seedWindowDefaultsOnce(mockRpc({ defaultMode: 'edge', defaultPosition: 'right' }), state)

    expect(state.value.mode).toBe('edge')
    expect(state.value.position).toBe('right')
  })

  it('leaves the fallback untouched when nothing is declared', async () => {
    const state = panelState()
    await seedWindowDefaultsOnce(mockRpc({}), state)

    expect(state.value.mode).toBe('float')
    expect(state.value.position).toBe('left')
  })

  it('applies only the declared field, leaving the other at its fallback', async () => {
    const state = panelState()
    await seedWindowDefaultsOnce(mockRpc({ defaultMode: 'edge' }), state)

    expect(state.value.mode).toBe('edge')
    expect(state.value.position).toBe('left')
  })

  it('applies the default once it arrives later, and only once', async () => {
    const sharedState = createSharedState<DevToolsDockConfig>({ initialValue: {}, enablePatches: false })
    const rpc = {
      sharedState: {
        get: async () => sharedState,
      },
    } as unknown as DevToolsRpcClient
    const state = panelState()

    const seeded = seedWindowDefaultsOnce(rpc, state)
    sharedState.mutate((config) => {
      config.defaultMode = 'edge'
      config.defaultPosition = 'right'
    })
    await seeded

    expect(state.value.mode).toBe('edge')
    expect(state.value.position).toBe('right')

    // A later reconfiguration (e.g. `ctx.dockConfig.mutate()`) must not keep
    // repositioning a dock the developer has since moved.
    state.value.mode = 'float'
    sharedState.mutate((config) => {
      config.defaultMode = 'edge'
    })
    expect(state.value.mode).toBe('float')
  })
})
