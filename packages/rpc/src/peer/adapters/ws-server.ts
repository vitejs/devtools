import type { BirpcGroup, BirpcOptions, ChannelOptions } from 'birpc'
import type { IncomingMessage } from 'node:http'
import type { ServerOptions as HttpsServerOptions } from 'node:https'
import type { WebSocket } from 'ws'
import type { DevToolsNodeRpcSessionMeta } from '../../presets/ws/server'
import type { Link } from '../link'
import type { PeerDescriptor, TransportAdapter } from '../types'
import { createServer as createHttpsServer } from 'node:https'
import { parse, stringify } from 'structured-clone-es'
import { WebSocketServer } from 'ws'
import { createLink } from '../link'

/**
 * Session metadata tracked per WebSocket connection.
 *
 * Re-exported from the legacy preset so callers that read these fields
 * (auth-revoke, ws logs, etc.) continue to work.
 */
export type WsServerSessionMeta = DevToolsNodeRpcSessionMeta

export interface WsServerAdapterOptions<
  ClientFunctions extends object,
  ServerFunctions extends object,
> {
  port: number
  host?: string
  https?: HttpsServerOptions | undefined
  /**
   * The BirpcGroup that tracks all incoming channels. The adapter adds each
   * accepted connection's channel to the group.
   */
  rpcGroup: BirpcGroup<ClientFunctions, ServerFunctions, false>
  /**
   * Build the PeerDescriptor for an incoming connection.
   *
   * The default strategy derives role/id from query params, but consumers
   * typically replace this with auth-driven logic.
   */
  resolvePeer: (
    req: IncomingMessage,
    meta: WsServerSessionMeta,
  ) => PeerDescriptor | Promise<PeerDescriptor>
  serialize?: BirpcOptions<any, any, false>['serialize']
  deserialize?: BirpcOptions<any, any, false>['deserialize']
  onConnected?: (ws: WebSocket, req: IncomingMessage, meta: WsServerSessionMeta) => void
  onDisconnected?: (ws: WebSocket, meta: WsServerSessionMeta) => void
}

let sessionIdCounter = 0

/**
 * Create a transport adapter that listens for WebSocket connections and
 * registers each as a Link in the mesh.
 */
export function createWsServerAdapter<
  ClientFunctions extends object,
  ServerFunctions extends object,
>(options: WsServerAdapterOptions<ClientFunctions, ServerFunctions>): TransportAdapter {
  const {
    port,
    host = 'localhost',
    https,
    rpcGroup,
    resolvePeer,
    serialize = stringify,
    deserialize = parse,
    onConnected,
    onDisconnected,
  } = options

  const httpsServer = https ? createHttpsServer(https) : undefined
  const wss = https
    ? new WebSocketServer({ server: httpsServer })
    : new WebSocketServer({ port, host })

  const activeLinks: Set<Link> = new Set()

  const adapter: TransportAdapter = {
    kind: 'ws',

    async setup(ctx) {
      wss.on('connection', async (ws, req) => {
        const meta: WsServerSessionMeta = {
          id: sessionIdCounter++,
          ws,
          subscribedStates: new Set(),
        }

        const channel: ChannelOptions = {
          post: (data) => {
            ws.send(data)
          },
          on: (fn) => {
            ws.on('message', (data) => {
              fn(data.toString())
            })
          },
          serialize,
          deserialize,
          meta,
        }

        // Resolve peer descriptor (typically inspects auth-token in query)
        const remote = await resolvePeer(req, meta)
        meta.peerId = remote.id
        meta.peerRole = remote.role

        // Add channel to the birpc group and grab the resulting birpc handle.
        rpcGroup.updateChannels((channels) => {
          channels.push(channel)
        })
        const rpcHandle = rpcGroup.clients.find(c => c.$meta === meta)
        if (!rpcHandle) {
          // Should not happen — updateChannels just added it
          ws.close()
          return
        }

        const link = createLink({
          id: `ws:${meta.id}`,
          remote,
          kind: 'ws',
          rpc: rpcHandle,
          isDirect: true,
          meta: { sessionMeta: meta },
        })

        activeLinks.add(link)
        ctx.attachLink(link)
        onConnected?.(ws, req, meta)

        ws.on('close', () => {
          rpcGroup.updateChannels((channels) => {
            const index = channels.indexOf(channel)
            if (index >= 0)
              channels.splice(index, 1)
          })
          activeLinks.delete(link)
          link.close()
          onDisconnected?.(ws, meta)
        })
      })

      if (httpsServer)
        httpsServer.listen(port, host)
    },

    async dispose() {
      for (const link of activeLinks)
        link.close()
      activeLinks.clear()
      wss.close()
      httpsServer?.close()
    },
  }

  return adapter
}
