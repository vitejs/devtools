import type { ChannelOptions } from 'birpc'
import type { RpcClientPreset } from '..'
import { parse, stringify } from 'structured-clone-es'
import { defineRpcClientPreset } from '..'

export interface WebSocketRpcClientOptions {
  url: string
  onConnected?: (e: Event) => void
  onError?: (e: Error) => void
  onDisconnected?: (e: CloseEvent) => void
  authId?: string
}

function NOOP() {}

export const createWsRpcPreset: RpcClientPreset<(options: WebSocketRpcClientOptions) => ChannelOptions> = defineRpcClientPreset((options: WebSocketRpcClientOptions) => {
  let url = options.url
  if (options.authId) {
    url = `${url}?vite_devtools_auth_id=${encodeURIComponent(options.authId)}`
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
})
