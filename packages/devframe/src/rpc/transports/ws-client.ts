import type { ChannelOptions } from 'birpc'
import { parse, stringify } from 'structured-clone-es'

export interface WsRpcChannelOptions {
  url: string
  onConnected?: (e: Event) => void
  onError?: (e: Error) => void
  onDisconnected?: (e: CloseEvent) => void
  authToken?: string
}

function NOOP() {}

/**
 * Build a birpc `ChannelOptions` object backed by a browser `WebSocket`.
 * Pass the result straight to `createRpcClient`'s `channel` option.
 */
export function createWsRpcChannel(options: WsRpcChannelOptions): ChannelOptions {
  let url = options.url
  if (options.authToken) {
    url = `${url}?vite_devtools_auth_token=${encodeURIComponent(options.authToken)}`
  }
  const ws = new WebSocket(url)
  const {
    onConnected = NOOP,
    onError = NOOP,
    onDisconnected = NOOP,
  } = options

  ws.addEventListener('open', (e) => {
    onConnected(e)
  })

  ws.addEventListener('error', (e) => {
    const _e = e instanceof Error ? e : new Error(e.type)
    onError(_e)
  })

  ws.addEventListener('close', (e) => {
    onDisconnected(e)
  })

  return {
    on: (handler: (data: string) => void) => {
      ws.addEventListener('message', (e) => {
        handler(e.data)
      })
    },
    post: (data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
      else {
        function handler() {
          ws.send(data)
          ws.removeEventListener('open', handler)
        }
        ws.addEventListener('open', handler)
      }
    },
    serialize: stringify,
    deserialize: parse,
  }
}
