import { afterEach, describe, expect, it, vi } from 'vitest'
import { installInspectedPageRelay } from './inspected-page-relay'

function listeners() {
  const callbacks = new Set<(...args: any[]) => void>()
  return {
    addListener: vi.fn(callback => callbacks.add(callback)),
    removeListener: vi.fn(callback => callbacks.delete(callback)),
    emit: (...args: any[]) => callbacks.forEach(callback => callback(...args)),
  }
}

function setup() {
  vi.useFakeTimers()
  const window = Object.assign(new EventTarget(), { postMessage: vi.fn() })
  const onConnect = listeners()
  const channels: {
    port1: { onmessage?: (event: { data: unknown }) => void, close: ReturnType<typeof vi.fn>, postMessage: ReturnType<typeof vi.fn> }
    port2: object
  }[] = []
  vi.stubGlobal('window', window)
  vi.stubGlobal('location', { origin: 'http://localhost:5173' })
  vi.stubGlobal('chrome', { runtime: { onConnect } })
  vi.stubGlobal('MessageChannel', class {
    port1 = { close: vi.fn(), postMessage: vi.fn() }
    port2 = {}
    constructor() {
      channels.push(this)
    }
  })
  const extensionPort = {
    name: 'vite-devtools:inspected-page:session',
    onMessage: listeners(),
    onDisconnect: listeners(),
    postMessage: vi.fn(),
    disconnect: vi.fn(),
  }
  installInspectedPageRelay()
  onConnect.emit(extensionPort)
  return { channels, window, onConnect, extensionPort }
}

describe('isolated inspected page relay', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__VITE_DEVTOOLS_PAGE_RELAY__')
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('reuses the isolated-world listener across panel reconnections', () => {
    const state = setup()
    installInspectedPageRelay()
    expect(state.onConnect.addListener).toHaveBeenCalledOnce()
    expect(state.window.postMessage).toHaveBeenCalledWith(
      { type: 'devframe:inspected-page:connect', session: 'session' },
      'http://localhost:5173',
      [state.channels[0]!.port2],
    )
    state.extensionPort.onDisconnect.emit()
  })

  it('waits for the page bootstrap and drains requests only after its handshake', () => {
    const state = setup()
    const request = { type: 'request', id: '1', method: 'prepare', entryId: 'a11y' }
    state.extensionPort.onMessage.emit(request)
    expect(state.channels[0]!.port1.postMessage).not.toHaveBeenCalled()
    vi.advanceTimersByTime(250)
    expect(state.channels[0]!.port1.close).toHaveBeenCalledOnce()
    expect(state.channels).toHaveLength(2)
    state.channels[1]!.port1.onmessage?.({ data: { type: 'ready' } })
    expect(state.channels[1]!.port1.postMessage).toHaveBeenCalledWith(request)
    expect(state.extensionPort.postMessage).toHaveBeenCalledWith({ type: 'ready' })
    vi.advanceTimersByTime(1000)
    expect(state.channels).toHaveLength(2)
    state.extensionPort.onDisconnect.emit()
  })

  it('releases page actions and stops relaying after the panel disconnects', () => {
    const state = setup()
    const page = state.channels[0]!.port1
    page.onmessage?.({ data: { type: 'ready' } })
    state.extensionPort.onDisconnect.emit()
    expect(page.postMessage).toHaveBeenCalledWith({ type: 'disconnect' })
    expect(page.close).toHaveBeenCalledOnce()
    page.postMessage.mockClear()
    state.extensionPort.onMessage.emit({ type: 'request' })
    expect(page.postMessage).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(state.channels).toHaveLength(1)
  })

  it('disconnects the extension port when its specific page is unloaded', () => {
    const state = setup()
    state.window.dispatchEvent(new Event('pagehide'))
    expect(state.extensionPort.disconnect).toHaveBeenCalledOnce()
    expect(state.channels[0]!.port1.close).toHaveBeenCalledOnce()
  })
})
