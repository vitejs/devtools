import type { BirpcGroup, ChannelOptions } from 'birpc'
import type { IncomingMessage } from 'node:http'
import type { ServerOptions as HttpsServerOptions } from 'node:https'
import type { WebSocket } from 'ws'
import type { RpcFunctionDefinitionAny } from '../types'
import { createServer as createHttpsServer } from 'node:https'
import { WebSocketServer } from 'ws'
import { structuredCloneParse, structuredCloneStringify } from '../../utils/structured-clone'
import { strictJsonStringify, STRUCTURED_CLONE_PREFIX } from '../serialization'

export interface DevToolsNodeRpcSessionMeta {
  id: number
  ws?: WebSocket
  clientAuthToken?: string
  isTrusted?: boolean
  subscribedStates: Set<string>
  /**
   * Streams this session has subscribed to via
   * `rpc.streaming.subscribe(channel, id)`. Tracked here for O(1) cleanup
   * on disconnect; the wire format is `${channel}\x1F${id}`.
   */
  subscribedStreams?: Set<string>
  /**
   * Inbound streams this session is currently uploading to (via
   * `rpc.streaming.upload(channel, id)`). Tracked for cleanup on
   * disconnect; same wire format as `subscribedStreams`.
   */
  uploadingStreams?: Set<string>
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
  /**
   * RPC function definitions, used by the per-call wire serializer to
   * dispatch between strict-JSON and structured-clone encoding based
   * on each function's `jsonSerializable` flag.
   *
   * When omitted, all messages fall back to structured-clone — safe but
   * loses dev-time validation for `jsonSerializable: true` declarations.
   */
  definitions?: ReadonlyMap<string, Pick<RpcFunctionDefinitionAny, 'jsonSerializable'>>
  onConnected?: (ws: WebSocket, req: IncomingMessage, meta: DevToolsNodeRpcSessionMeta) => void
  onDisconnected?: (ws: WebSocket, meta: DevToolsNodeRpcSessionMeta) => void
  /** Override the default per-call serializer. Most callers should leave this unset. */
  serialize?: ChannelOptions['serialize']
  /** Override the default per-call deserializer. Most callers should leave this unset. */
  deserialize?: ChannelOptions['deserialize']
}

let sessionId = 0

const EMPTY_DEFS: ReadonlyMap<string, Pick<RpcFunctionDefinitionAny, 'jsonSerializable'>> = new Map()

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
    definitions = EMPTY_DEFS,
    serialize: serializeOverride,
    deserialize: deserializeOverride,
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

    // Per-connection state: maps an incoming request id to its method
    // name so the matching outgoing response can look the method back
    // up in `definitions` and pick the right encoder. One map per WS
    // session — request-id spaces don't collide across sessions.
    const pendingRequestMethods = new Map<string, string>()
    const channel: ChannelOptions = {
      post: (data) => {
        ws.send(data)
      },
      on: (fn) => {
        ws.on('message', (data) => {
          fn(data.toString())
        })
      },
      serialize: serializeOverride ?? ((msg: any): string => {
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
      }),
      deserialize: deserializeOverride ?? ((raw: string): any => {
        const msg: any = raw.startsWith(STRUCTURED_CLONE_PREFIX)
          ? structuredCloneParse(raw.slice(STRUCTURED_CLONE_PREFIX.length))
          : JSON.parse(raw)
        if (msg.t === 'q' && msg.i && msg.m)
          pendingRequestMethods.set(msg.i, msg.m)
        return msg
      }),
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
