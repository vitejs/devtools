import type { WebSocket } from 'ws'
import type { ConnectionMeta } from '../shared/types'
import type { CreateServerFunctionsOptions } from './functions'
import type { ServerFunctions } from './rpc'
import { createRpcServer } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/server'
import c from 'ansis'
import { getPort } from 'get-port-please'
import { MARK_CHECK } from './constants'
import { createServerFunctions } from './functions'

export interface CreateWsServerOptions extends CreateServerFunctionsOptions {
  cwd: string
  port?: number
}

export async function createWsServer(options: CreateWsServerOptions) {
  const port = options.port ?? await getPort({ port: 7812, random: true })

  const wsClients = new Set<WebSocket>()

  const serverFunctions = await createServerFunctions(options)

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

  const rpc = createRpcServer<ServerFunctions, ServerFunctions>(serverFunctions, {
    preset,
    rpcOptions: {
      onError(error, name) {
        console.error(c.red`⬢ RPC error on executing "${c.bold(name)}":`)
        console.error(error)
        throw error
      },
    },
  })

  const getMetadata = async (): Promise<ConnectionMeta> => {
    return {
      backend: 'websocket',
      websocket: port,
    }
  }

  return {
    port,
    rpc,
    serverFunctions,
    getMetadata,
  }
}
