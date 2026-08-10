import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { startDevTools, useLocalStorageSharedState } from './runtime'

const mocks = vi.hoisted(() => ({
  getDevToolsRpcClient: vi.fn(
    (_options: { baseURL: string[] }) => new Promise(() => {}),
  ),
  useLocalStorage: vi.fn(),
}))

vi.mock('@vitejs/devtools-kit/client', () => ({
  CLIENT_CONTEXT_KEY: '__VITE_DEVTOOLS_CLIENT_CONTEXT__',
  getDevToolsRpcClient: mocks.getDevToolsRpcClient,
}))

vi.mock('@vueuse/core', () => ({
  useLocalStorage: mocks.useLocalStorage,
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

describe('useLocalStorageSharedState', () => {
  afterEach(() => {
    mocks.useLocalStorage.mockReset()
  })

  it('returns the exact ref useLocalStorage produces, untouched', () => {
    const state = ref({ open: false })
    mocks.useLocalStorage.mockReturnValue(state)
    const rpc = { sharedState: { get: vi.fn(() => new Promise(() => {})) } } as any

    expect(useLocalStorageSharedState(rpc, 'k', { open: false })).toBe(state)
  })

  it('creates the shared-state slot under the same key, seeded from the current local value', () => {
    const state = ref({ open: true, mode: 'float' })
    mocks.useLocalStorage.mockReturnValue(state)
    const get = vi.fn(() => new Promise(() => {}))
    const rpc = { sharedState: { get } } as any

    useLocalStorageSharedState(rpc, 'vite-devtools-dock-state', { open: false, mode: 'float' })

    expect(get).toHaveBeenCalledWith('vite-devtools-dock-state', { initialValue: state.value })
  })

  it('mirrors every local change into the shared state once the slot resolves', async () => {
    const state = ref<{ open: boolean }>({ open: false })
    mocks.useLocalStorage.mockReturnValue(state)
    const mutate = vi.fn()
    const sharedStatePromise = Promise.resolve({ mutate })
    const rpc = { sharedState: { get: vi.fn(() => sharedStatePromise) } } as any

    useLocalStorageSharedState(rpc, 'k', { open: false })
    await sharedStatePromise // by then, the watchEffect this attaches has already run once, synchronously

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0]![0]()).toStrictEqual({ open: false })

    mutate.mockClear()
    state.value = { open: true }
    await nextTick() // let the watchEffect's reactive dependency flush

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0]![0]()).toStrictEqual({ open: true })
  })
})
