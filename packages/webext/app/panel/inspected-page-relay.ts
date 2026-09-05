/** Runs in the inspected document's isolated world; keep this function self-contained. */
export function installInspectedPageRelay() {
  const global = globalThis as typeof globalThis & { __VITE_DEVTOOLS_PAGE_RELAY__?: boolean }
  if (global.__VITE_DEVTOOLS_PAGE_RELAY__)
    return
  global.__VITE_DEVTOOLS_PAGE_RELAY__ = true

  chrome.runtime.onConnect.addListener((extensionPort) => {
    const prefix = 'vite-devtools:inspected-page:'
    if (!extensionPort.name.startsWith(prefix))
      return

    const session = extensionPort.name.slice(prefix.length)
    if (!/^[\w-]+$/.test(session))
      return

    let pagePort: MessagePort | undefined
    let ready = false
    let closed = false
    let retry: ReturnType<typeof setTimeout> | undefined
    const pending: unknown[] = []

    function close() {
      if (closed)
        return
      closed = true
      clearTimeout(retry)
      pagePort?.postMessage({ type: 'disconnect' })
      pagePort?.close()
      pending.length = 0
      extensionPort.onMessage.removeListener(receive)
      extensionPort.onDisconnect.removeListener(close)
      window.removeEventListener('pagehide', disconnect)
    }

    function disconnect() {
      close()
      extensionPort.disconnect()
    }

    function receive(message: unknown) {
      if (ready)
        pagePort?.postMessage(message)
      else
        pending.push(message)
    }

    function connect() {
      if (closed || ready)
        return
      pagePort?.close()
      const channel = new MessageChannel()
      pagePort = channel.port1
      pagePort.onmessage = ({ data }) => {
        if (closed)
          return
        if (data?.type === 'ready') {
          ready = true
          clearTimeout(retry)
          for (const message of pending.splice(0))
            pagePort?.postMessage(message)
        }
        extensionPort.postMessage(data)
      }
      window.postMessage({ type: 'devframe:inspected-page:connect', session }, location.origin, [channel.port2])
      retry = setTimeout(connect, 250)
    }

    extensionPort.onMessage.addListener(receive)
    extensionPort.onDisconnect.addListener(close)
    window.addEventListener('pagehide', disconnect)
    connect()
  })
}
