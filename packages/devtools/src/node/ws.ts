/* eslint-disable no-console */
import type { ConnectionMeta, DevToolsSetupContext } from '@vitejs/devtools-kit'
import type { WebSocket } from 'ws'
import type { RpcFunctionsHost } from './functions'
import { createRpcServer } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/server'
import c from 'ansis'
import { getPort } from 'get-port-please'
import { MARK_CHECK } from './constants'

export interface CreateWsServerOptions {
  cwd: string
  port?: number
  context: DevToolsSetupContext
  functions: RpcFunctionsHost
}

export async function createWsServer(options: CreateWsServerOptions) {
  const functions = options.functions
  const port = options.port ?? await getPort({ port: 7812, random: true })

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

  const rpc = createRpcServer<any, any>(
    options.functions.functions,
    {
      preset,
      rpcOptions: {
        onError(error, name) {
          console.error(c.red`⬢ RPC error on executing "${c.bold(name)}":`)
          console.error(error)
          throw error
        },
      },
    },
  )

  const getMetadata = async (): Promise<ConnectionMeta> => {
    return {
      backend: 'websocket',
      websocket: port,
    }
  }

  return {
    port,
    rpc,
    functions,
    getMetadata,
  }
}
