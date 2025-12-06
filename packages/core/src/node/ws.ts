/* eslint-disable no-console */
import type { ConnectionMeta, DevToolsNodeContext, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import type { WebSocket } from 'ws'
import { createRpcServer } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/server'
import c from 'ansis'
import { getPort } from 'get-port-please'
import { MARK_CHECK } from './constants'

export interface CreateWsServerOptions {
  cwd: string
  portWebSocket?: number
  base?: string
  context: DevToolsNodeContext
}

const ANONYMOUS_SCOPE = 'vite:anonymous:'

export async function createWsServer(options: CreateWsServerOptions) {
  const rpcHost = options.context.rpc
  const port = options.portWebSocket ?? await getPort({ port: 7812, random: true })

  const wsClients = new Set<WebSocket>()

  const preset = createWsRpcPreset({
    port: port!,
    onConnected: (ws) => {
      wsClients.add(ws)
      console.log(c.green`${MARK_CHECK} Websocket client connected`)
    },
    onDisconnected: (ws) => {
      wsClients.delete(ws)
      console.log(c.red`${MARK_CHECK} Websocket client disconnected`)
    },
  })

  const rpc = createRpcServer<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions>(
    rpcHost.functions,
    {
      preset,
      rpcOptions: {
        onFunctionError(error, name) {
          console.error(c.red`⬢ RPC error on executing "${c.bold(name)}":`)
          console.error(error)
        },
        resolver(name, fn) {
          if (name.startsWith(ANONYMOUS_SCOPE))
            return fn

          if (!this.$meta.isTrusted) {
            return () => {
              throw new Error(`Unauthorized access to method ${JSON.stringify(name)}, please trust this client first`)
            }
          }
          return fn
        },
        onRequest(req, next, resolve) {
          if (req.m.startsWith(ANONYMOUS_SCOPE))
            return next()

          // Do not boardcast to untrusted clients
          if (!this.$meta.isTrusted) {
            return resolve(undefined)
          }
          return next()
        },
      },
    },
  )

  rpcHost.boardcast = rpc.broadcast

  const getConnectionMeta = async (): Promise<ConnectionMeta> => {
    return {
      backend: 'websocket',
      websocket: port,
    }
  }

  return {
    port,
    rpc,
    rpcHost,
    getConnectionMeta,
  }
}
