import type { BirpcGroup, ChannelOptions } from 'birpc'
import type { IncomingMessage } from 'node:http'
import type { ServerOptions as HttpsServerOptions } from 'node:https'
import type { WebSocket } from 'ws'
import { createServer as createHttpsServer } from 'node:https'
import { parse, stringify } from 'structured-clone-es'
import { WebSocketServer } from 'ws'

export interface DevToolsNodeRpcSessionMeta {
  id: number
  ws?: WebSocket
  clientAuthToken?: string
  isTrusted?: boolean
  subscribedStates: Set<string>
}

export interface WsRpcTransportOptions {
  /** Attach to an existing WebSocketServer. When provided, `port`, `host`, and `https` are ignored. */
  wss?: WebSocketServer
  /** Port for a newly-created WebSocketServer. */
  port?: number
  /** Host for a newly-created WebSocketServer. Defaults to `localhost`. */
  host?: string
  /** When set, a new https.Server is created and the WebSocketServer is attached to it. */
  https?: HttpsServerOptions
  onConnected?: (ws: WebSocket, req: IncomingMessage, meta: DevToolsNodeRpcSessionMeta) => void
  onDisconnected?: (ws: WebSocket, meta: DevToolsNodeRpcSessionMeta) => void
  serialize?: ChannelOptions['serialize']
  deserialize?: ChannelOptions['deserialize']
}

let sessionId = 0

function NOOP() {}

/**
 * Attach a WebSocket transport to an existing RPC group. Either pass an
 * existing `WebSocketServer` via `wss`, or let this helper create one from
 * `port` / `host` / `https`.
 */
export function attachWsRpcTransport<
  ClientFunctions extends object,
  ServerFunctions extends object,
>(
  rpcGroup: BirpcGroup<ClientFunctions, ServerFunctions, false>,
  options: WsRpcTransportOptions = {},
): { wss: WebSocketServer } {
  const {
    wss: externalWss,
    port,
    host = 'localhost',
    https,
    onConnected = NOOP,
    onDisconnected = NOOP,
    serialize = stringify,
    deserialize = parse,
  } = options

  let wss: WebSocketServer
  if (externalWss) {
    wss = externalWss
  }
  else if (https) {
    const httpsServer = createHttpsServer(https)
    wss = new WebSocketServer({ server: httpsServer })
    httpsServer.listen(port, host)
  }
  else {
    wss = new WebSocketServer({ port, host })
  }

  wss.on('connection', (ws, req) => {
    const meta: DevToolsNodeRpcSessionMeta = {
      id: sessionId++,
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

    rpcGroup.updateChannels((channels) => {
      channels.push(channel)
    })

    ws.on('close', () => {
      rpcGroup.updateChannels((channels) => {
        const index = channels.indexOf(channel)
        if (index >= 0)
          channels.splice(index, 1)
      })
      onDisconnected(ws, meta)
    })
    onConnected(ws, req, meta)
  })

  return { wss }
}
