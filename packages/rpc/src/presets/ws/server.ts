import type { DevToolsNodeRpcSessionMeta } from '@vitejs/devtools-kit'
import type { BirpcGroup, BirpcOptions, ChannelOptions } from 'birpc'
import type { WebSocket } from 'ws'
import type { RpcServerPreset } from '..'
import { parse, stringify } from 'structured-clone-es'
import { WebSocketServer } from 'ws'
import { defineRpcServerPreset } from '..'

export interface WebSocketRpcServerOptions {
  port: number
  onConnected?: (ws: WebSocket, meta: DevToolsNodeRpcSessionMeta) => void
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
    onConnected = NOOP,
    onDisconnected = NOOP,
  } = options

  const wss = new WebSocketServer({
    port,
  })

  return <ClientFunctions extends object, ServerFunctions extends object>(
    rpc: BirpcGroup<ClientFunctions, ServerFunctions, false>,
    options?: Pick<BirpcOptions<ClientFunctions, ServerFunctions, false>, 'serialize' | 'deserialize'>,
  ) => {
    const {
      serialize = stringify,
      deserialize = parse,
    } = options ?? {}

    wss.on('connection', (ws) => {
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

      rpc.updateChannels((channels) => {
        channels.push(channel)
      })

      ws.on('close', () => {
        rpc.updateChannels((channels) => {
          const index = channels.indexOf(channel)
          if (index >= 0)
            channels.splice(index, 1)
        })
        onDisconnected(ws, meta)
      })
      onConnected(ws, meta)
    })
  }
})
