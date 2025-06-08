import type { BirpcGroup, BirpcOptions, ChannelOptions } from 'birpc'
import type { WebSocket } from 'ws'
import { parse, stringify } from 'structured-clone-es'
import { WebSocketServer } from 'ws'
import { defineRpcServerPreset } from '..'

export interface WebSocketRpcServerOptions {
  port: number
  onConnected?: (ws: WebSocket) => void
  onDisconnected?: (ws: WebSocket) => void
}

function NOOP() {}

export const createWsRpcPreset = defineRpcServerPreset((options: WebSocketRpcServerOptions) => {
  const {
    port,
    onConnected = NOOP,
    onDisconnected = NOOP,
  } = options
  const wss = new WebSocketServer({
    port,
  })

  return <ClientFunctions, ServerFunctions>(rpc: BirpcGroup<ClientFunctions, ServerFunctions>, options?: Pick<BirpcOptions<ClientFunctions>, 'serialize' | 'deserialize'>) => {
    const {
      serialize = stringify,
      deserialize = parse,
    } = options ?? {}

    wss.on('connection', (ws) => {
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
        onDisconnected(ws)
      })
      onConnected(ws)
    })
  }
})
