import { installInspectedPageRelay } from './inspected-page-relay'

interface InspectedPageBridgeOptions {
  tabId: number
  viewerUrl: string
  session: string
  getViewerWindow: () => Window | null | undefined
  onError: (message: string) => void
}

export function isViewerBridgeConnect(
  event: Pick<MessageEvent, 'source' | 'origin' | 'data' | 'ports'>,
  viewerWindow: Window | null | undefined,
  viewerOrigin: string,
  session: string,
) {
  return !!viewerWindow
    && event.source === viewerWindow
    && event.origin === viewerOrigin
    && event.data?.type === 'devframe:inspected-page:connect'
    && event.data.session === session
    && event.ports.length === 1
}

export function createInspectedPageBridge(options: InspectedPageBridgeOptions) {
  let disposed = false
  let viewerPort: MessagePort | undefined
  let runtimePort: chrome.runtime.Port | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const viewerOrigin = new URL(options.viewerUrl).origin

  function disconnect() {
    clearTimeout(timer)
    viewerPort?.postMessage({ type: 'disconnect' })
    viewerPort?.close()
    viewerPort = undefined
    runtimePort?.onDisconnect.removeListener(handleDisconnect)
    runtimePort?.disconnect()
    runtimePort = undefined
  }

  function fail(message: string) {
    if (disposed)
      return
    viewerPort?.postMessage({ type: 'error', message })
    disconnect()
    options.onError(message)
  }

  function startTimeout() {
    timer = setTimeout(() => {
      fail('The inspected page does not support the DevTools page bridge. Update Vite DevTools and @devframes/hub, restart the dev server, then reload the page.')
    }, 10_000)
  }

  function handleDisconnect() {
    // Read lastError so Chrome does not report a second, unhandled error.
    const detail = chrome.runtime.lastError?.message
    fail(detail || 'The inspected page disconnected. Reload the page to reconnect Vite DevTools.')
  }

  async function connect(event: MessageEvent) {
    if (disposed || !isViewerBridgeConnect(event, options.getViewerWindow(), viewerOrigin, options.session))
      return

    disconnect()
    const port = event.ports[0]!
    viewerPort = port
    const pending: unknown[] = []
    port.onmessage = ({ data }) => {
      if (runtimePort)
        runtimePort.postMessage(data)
      else
        pending.push(data)
    }
    startTimeout()

    try {
      const [injection] = await chrome.scripting.executeScript({
        func: installInspectedPageRelay,
        target: { tabId: options.tabId, frameIds: [0] },
        world: 'ISOLATED',
      })
      if (disposed || viewerPort !== port)
        return
      if (!injection?.documentId)
        throw new Error('Unable to identify the inspected document. Reload the page and reconnect Vite DevTools.')

      runtimePort = chrome.tabs.connect(options.tabId, {
        documentId: injection.documentId,
        name: `vite-devtools:inspected-page:${options.session}`,
      })
      runtimePort.onDisconnect.addListener(handleDisconnect)
      runtimePort.onMessage.addListener((data) => {
        if (data?.type === 'ready')
          clearTimeout(timer)
        if (data?.type === 'error') {
          fail(String(data.message))
          return
        }
        port.postMessage(data)
      })
      for (const message of pending)
        runtimePort.postMessage(message)
    }
    catch (error) {
      if (!disposed && viewerPort === port)
        fail(error instanceof Error ? error.message : String(error))
    }
  }

  window.addEventListener('message', connect)
  startTimeout()
  return () => {
    disposed = true
    window.removeEventListener('message', connect)
    disconnect()
  }
}
