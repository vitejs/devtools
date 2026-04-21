import type { BirpcOptions, BirpcReturn, ChannelOptions } from 'birpc'
import type { PeerDescriptor, TransportAdapter } from '../types'
import { createBirpc } from 'birpc'
import { parse, stringify } from 'structured-clone-es'
import { createLink } from '../link'

export interface WsClientAdapterOptions<
  ServerFunctions extends object,
  ClientFunctions extends object,
> {
  url: string
  authToken?: string
  /** Functions this peer exposes to the server. */
  clientFunctions: ClientFunctions
  /**
   * Initial descriptor for the server peer. May be refined later via the
   * directory/hello handshake; for Phase 1 a well-known shape is fine.
   */
  remote: PeerDescriptor
  rpcOptions?: Partial<BirpcOptions<ServerFunctions, ClientFunctions, boolean>>
  onConnected?: (e: Event) => void
  onError?: (e: Error) => void
  onDisconnected?: (e: CloseEvent) => void
  /**
   * Optional callback invoked with the live birpc handle after the link is
   * attached. The kit-level client mode uses this to call
   * `vite:anonymous:auth` and install client-side event handlers.
   */
  onHandle?: (rpc: BirpcReturn<ServerFunctions, ClientFunctions, false>) => void
}

/**
 * Create a transport adapter that opens a single outgoing WebSocket
 * connection to the devtools-server and registers it as a Link.
 */
export function createWsClientAdapter<
  ServerFunctions extends object = Record<string, never>,
  ClientFunctions extends object = Record<string, never>,
>(options: WsClientAdapterOptions<ServerFunctions, ClientFunctions>): TransportAdapter {
  const {
    url,
    authToken,
    clientFunctions,
    remote,
    rpcOptions = {},
    onConnected,
    onError,
    onDisconnected,
    onHandle,
  } = options

  let closed = false
  let cleanup: (() => void) | undefined

  const adapter: TransportAdapter = {
    kind: 'ws',
    canServe(_local, r) {
      return r.id === remote.id
    },

    async setup(ctx) {
      const wsUrl = authToken
        ? `${url}?vite_devtools_auth_token=${encodeURIComponent(authToken)}`
        : url
      const ws = new WebSocket(wsUrl)

      ws.addEventListener('open', (e) => {
        onConnected?.(e)
      })
      ws.addEventListener('error', (e) => {
        const _e = e instanceof Error ? e : new Error(e.type)
        onError?.(_e)
      })
      ws.addEventListener('close', (e) => {
        onDisconnected?.(e)
      })

      const channel: ChannelOptions = {
        on: (handler) => {
          ws.addEventListener('message', (e) => {
            handler(e.data)
          })
        },
        post: (data) => {
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

      const rpc = createBirpc<ServerFunctions, ClientFunctions, false>(
        clientFunctions,
        {
          ...channel,
          timeout: -1,
          ...rpcOptions,
          proxify: false,
        },
      )

      const link = createLink({
        id: `ws-client:${remote.id}`,
        remote,
        kind: 'ws',
        rpc: rpc as BirpcReturn<any, any, false>,
        isDirect: true,
      })

      ctx.attachLink(link)
      onHandle?.(rpc)

      cleanup = () => {
        if (closed)
          return
        closed = true
        try {
          ws.close()
        }
        catch {}
        link.close()
      }
    },

    async dispose() {
      cleanup?.()
    },
  }

  return adapter
}
