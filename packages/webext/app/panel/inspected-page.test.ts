import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInspectedPageBridge, isViewerBridgeConnect } from './inspected-page'
import { installInspectedPageRelay } from './inspected-page-relay'

function eventListeners() {
  const listeners = new Set<(...args: any[]) => void>()
  return {
    addListener: vi.fn(listener => listeners.add(listener)),
    removeListener: vi.fn(listener => listeners.delete(listener)),
    emit: (...args: any[]) => listeners.forEach(listener => listener(...args)),
  }
}

function setup() {
  const window = new EventTarget()
  vi.stubGlobal('window', window)
  const viewerWindow = {} as Window
  const viewerPort = {
    postMessage: vi.fn(),
    close: vi.fn(),
    onmessage: undefined as ((event: { data: unknown }) => void) | undefined,
  }
  const runtimePort = {
    onMessage: eventListeners(),
    onDisconnect: eventListeners(),
    postMessage: vi.fn(),
    disconnect: vi.fn(),
  }
  const executeScript = vi.fn().mockResolvedValue([{ documentId: 'inspected-document', frameId: 0 }])
  const connect = vi.fn(() => runtimePort)
  vi.stubGlobal('chrome', {
    scripting: { executeScript },
    tabs: { connect },
    runtime: {},
  })
  const onError = vi.fn()
  const dispose = createInspectedPageBridge({
    tabId: 42,
    session: 'panel-session',
    viewerUrl: 'http://localhost:5173/__devtools/',
    getViewerWindow: () => viewerWindow,
    onError,
  })
  function message(overrides: Record<string, unknown> = {}) {
    const event = new Event('message')
    Object.assign(event, {
      source: viewerWindow,
      origin: 'http://localhost:5173',
      data: { type: 'devframe:inspected-page:connect', session: 'panel-session' },
      ports: [viewerPort],
    }, overrides)
    window.dispatchEvent(event)
  }
  return { message, viewerWindow, viewerPort, runtimePort, executeScript, connect, onError, dispose }
}

describe('inspected page bridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('requires the viewer window, origin, session, and exactly one port', () => {
    const source = {} as Window
    const event = {
      source,
      origin: 'http://localhost:5173',
      data: { type: 'devframe:inspected-page:connect', session: 'session' },
      ports: [{} as MessagePort],
    }
    expect(isViewerBridgeConnect(event, source, event.origin, 'session')).toBe(true)
    expect(isViewerBridgeConnect(event, {} as Window, event.origin, 'session')).toBe(false)
    expect(isViewerBridgeConnect(event, null, event.origin, 'session')).toBe(false)
    expect(isViewerBridgeConnect(event, source, 'http://localhost:5174', 'session')).toBe(false)
    expect(isViewerBridgeConnect(event, source, event.origin, 'another-session')).toBe(false)
    expect(isViewerBridgeConnect({ ...event, ports: [] }, source, event.origin, 'session')).toBe(false)
  })

  it('injects only into the inspected tab main frame and connects to that document', async () => {
    const state = setup()
    state.message({ origin: 'http://unrelated.test' })
    expect(state.executeScript).not.toHaveBeenCalled()
    state.message()
    await vi.waitFor(() => expect(state.connect).toHaveBeenCalled())
    expect(state.executeScript).toHaveBeenCalledWith({
      func: installInspectedPageRelay,
      target: { tabId: 42, frameIds: [0] },
      world: 'ISOLATED',
    })
    expect(state.connect).toHaveBeenCalledWith(42, {
      documentId: 'inspected-document',
      name: 'vite-devtools:inspected-page:panel-session',
    })
    state.dispose()
  })

  it('relays requests and page selections through the bound ports', async () => {
    const state = setup()
    state.message()
    const request = { type: 'request', id: '1', method: 'activate', entryId: 'tracer' }
    state.viewerPort.onmessage?.({ data: request })
    await vi.waitFor(() => expect(state.runtimePort.postMessage).toHaveBeenCalledWith(request))
    const selection = { type: 'selection', entryId: null }
    state.runtimePort.onMessage.emit({ type: 'ready' })
    state.runtimePort.onMessage.emit(selection)
    expect(state.viewerPort.postMessage).toHaveBeenCalledWith(selection)
    state.dispose()
  })

  it('disconnects and reports page navigation or port loss without a fallback target', async () => {
    const state = setup()
    state.message()
    await vi.waitFor(() => expect(state.connect).toHaveBeenCalled())
    state.runtimePort.onDisconnect.emit()
    expect(state.viewerPort.postMessage).toHaveBeenCalledWith({ type: 'disconnect' })
    expect(state.viewerPort.close).toHaveBeenCalledOnce()
    expect(state.runtimePort.disconnect).toHaveBeenCalledOnce()
    expect(state.onError).toHaveBeenCalledWith(expect.stringContaining('inspected page disconnected'))
    state.dispose()
  })

  it('does not connect if disposed while the injection was pending', async () => {
    const state = setup()
    let finish!: (result: unknown) => void
    state.executeScript.mockImplementation(() => new Promise(resolve => finish = resolve))
    state.message()
    state.dispose()
    finish([{ documentId: 'old-document' }])
    await Promise.resolve()
    expect(state.connect).not.toHaveBeenCalled()
    state.message()
    expect(state.executeScript).toHaveBeenCalledOnce()
  })

  it('reports unsupported viewers even if they never request a bridge', () => {
    vi.useFakeTimers()
    const state = setup()
    vi.advanceTimersByTime(10_000)
    expect(state.onError).toHaveBeenCalledWith(expect.stringContaining('Update Vite DevTools and @devframes/hub'))
    expect(state.connect).not.toHaveBeenCalled()
    state.dispose()
  })
})
