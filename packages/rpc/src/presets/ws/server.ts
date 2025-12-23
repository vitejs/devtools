import type { DevToolsNodeContext, DevToolsNodeRpcSessionMeta } from '@vitejs/devtools-kit'
import type { BirpcGroup, BirpcOptions, ChannelOptions } from 'birpc'
import type { WebSocket } from 'ws'
import type { RpcServerPreset } from '..'
import process from 'node:process'
import { parse, stringify } from 'structured-clone-es'
import { WebSocketServer } from 'ws'
import { defineRpcServerPreset } from '..'
import { getInternalContext } from '../../../../core/src/node/context-internal'

export interface WebSocketRpcServerOptions {
  port: number
  host?: string
  context: DevToolsNodeContext
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
    host = 'localhost',
    onConnected = NOOP,
    onDisconnected = NOOP,
    context,
  } = options

  const isClientAuthDisabled = context.mode === 'build' || context.viteConfig.devtools?.clientAuth === false || process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH === 'true'
  if (isClientAuthDisabled) {
    console.warn('[Vite DevTools] Client authentication is disabled. Any browser can connect to the devtools and access to your server and filesystem.')
  }

  const internal = getInternalContext(context)

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
      const url = new URL(req.url ?? '', 'http://localhost')
      const authId = url.searchParams.get('vite_devtools_auth_id') ?? undefined
      let isTrusted = false
      if (isClientAuthDisabled) {
        isTrusted = true
      }
      else if (authId && internal.storage.auth.get().trusted[authId]) {
        isTrusted = true
      }

      const meta: DevToolsNodeRpcSessionMeta = {
        id: id++,
        ws,
        isTrusted,
        clientAuthId: authId,
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
      onConnected(ws, meta)
    })
  }
})
