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
        onGeneralError(error, name) {
          console.error(c.red`⬢ RPC error on executing "${c.bold(name)}":`)
          console.error(error)
          throw error
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
