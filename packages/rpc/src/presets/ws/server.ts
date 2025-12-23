import type { BirpcGroup, BirpcOptions, ChannelOptions } from 'birpc'
import type { IncomingMessage } from 'node:http'
import type { WebSocket } from 'ws'
import type { RpcServerPreset } from '..'
import { parse, stringify } from 'structured-clone-es'
import { WebSocketServer } from 'ws'
import { defineRpcServerPreset } from '..'

export interface DevToolsNodeRpcSessionMeta {
  id: number
  ws?: WebSocket
  clientAuthId?: string
  isTrusted?: boolean
}

export interface WebSocketRpcServerOptions {
  port: number
  host?: string
  onConnected?: (ws: WebSocket, req: IncomingMessage, meta: DevToolsNodeRpcSessionMeta) => void
  onDisconnected?: (ws: WebSocket, meta: DevToolsNodeRpcSessionMeta) => void
}

let id = 0

function NOOP() {}

export const createWsRpcPreset: RpcServerPreset<
  (options: WebSocketRpcServerOptions) =>
  <
    ClientFunctions extends object,
    ServerFunctions extends object,
  >(
    rpc: BirpcGroup<ClientFunctions, ServerFunctions, false>,
    options?: Pick<BirpcOptions<ClientFunctions, ServerFunctions, false>, 'serialize' | 'deserialize'>,
  ) => void
> = defineRpcServerPreset((options: WebSocketRpcServerOptions) => {
  const {
    port,
    host = 'localhost',
    onConnected = NOOP,
    onDisconnected = NOOP,
  } = options

  const wss = new WebSocketServer({
    port,
    host,
  })

  return <ClientFunctions extends object, ServerFunctions extends object>(
    rpcGroup: BirpcGroup<ClientFunctions, ServerFunctions, false>,
    options?: Pick<BirpcOptions<ClientFunctions, ServerFunctions, false>, 'serialize' | 'deserialize'>,
  ) => {
    const {
      serialize = stringify,
      deserialize = parse,
    } = options ?? {}

    wss.on('connection', (ws, req) => {
      const meta: DevToolsNodeRpcSessionMeta = {
        id: id++,
        ws,
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

      // const rpc = rpcGroup.clients.find(client => client.$meta.id === meta.id)

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
  }
})
