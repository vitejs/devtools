import type { ChannelOptions } from 'birpc'
import type { RpcFunctionDefinitionAny } from '../types'
import { structuredCloneParse, structuredCloneStringify } from '../../utils/structured-clone'
import { strictJsonStringify, STRUCTURED_CLONE_PREFIX } from '../serialization'

export interface WsRpcChannelOptions {
  url: string
  onConnected?: (e: Event) => void
  onError?: (e: Error) => void
  onDisconnected?: (e: CloseEvent) => void
  authToken?: string
  /**
   * RPC function definitions (or just the `jsonSerializable` flag per
   * method) used to dispatch the per-call wire serializer. Pass an
   * empty / partial map on clients that don't have the full registry —
   * encoding falls back to structured-clone (the safer superset) and
   * decoding still routes correctly via the wire prefix.
   */
  definitions?: ReadonlyMap<string, Pick<RpcFunctionDefinitionAny, 'jsonSerializable'>>
}

function NOOP() {}

const EMPTY_DEFS: ReadonlyMap<string, Pick<RpcFunctionDefinitionAny, 'jsonSerializable'>> = new Map()

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
    definitions = EMPTY_DEFS,
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

  // Per-channel state: maps an incoming request id to its method name
  // so the matching outgoing response can independently look the
  // method up in `definitions` and pick the right encoder.
  const pendingRequestMethods = new Map<string, string>()
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
    serialize: (msg: any): string => {
      let method: string | undefined
      if (msg.t === 'q') {
        method = msg.m
      }
      else {
        method = pendingRequestMethods.get(msg.i)
        pendingRequestMethods.delete(msg.i)
      }
      const useJson = !!method && definitions.get(method)?.jsonSerializable === true
      if (useJson)
        return strictJsonStringify(msg, method ?? '')
      return `${STRUCTURED_CLONE_PREFIX}${structuredCloneStringify(msg)}`
    },
    deserialize: (raw: string): any => {
      const msg: any = raw.startsWith(STRUCTURED_CLONE_PREFIX)
        ? structuredCloneParse(raw.slice(STRUCTURED_CLONE_PREFIX.length))
        : JSON.parse(raw)
      if (msg.t === 'q' && msg.i && msg.m)
        pendingRequestMethods.set(msg.i, msg.m)
      return msg
    },
  }
}
