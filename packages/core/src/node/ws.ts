/* eslint-disable no-console */
import type { ConnectionMeta, DevToolsNodeContext, DevToolsNodeRpcSession, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import type { WebSocket } from 'ws'
import type { RpcFunctionsHost } from './host-functions'
import { AsyncLocalStorage } from 'node:async_hooks'
import process from 'node:process'
import { createRpcServer } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/server'
import c from 'ansis'
import { getPort } from 'get-port-please'
import { createDebug } from 'obug'
import { MARK_INFO } from './constants'
import { getInternalContext } from './context-internal'

const debugInvoked = createDebug('vite:devtools:rpc:invoked')

export interface CreateWsServerOptions {
  cwd: string
  portWebSocket?: number
  hostWebSocket: string
  base?: string
  context: DevToolsNodeContext
}

const ANONYMOUS_SCOPE = 'vite:anonymous:'

export async function createWsServer(options: CreateWsServerOptions) {
  const rpcHost = options.context.rpc as unknown as RpcFunctionsHost
  const port = options.portWebSocket ?? await getPort({ port: 7812, random: true })!
  const host = options.hostWebSocket ?? 'localhost'

  const wsClients = new Set<WebSocket>()

  const context = options.context
  const contextInternal = getInternalContext(context)

  const isClientAuthDisabled = context.mode === 'build' || context.viteConfig.devtools?.clientAuth === false || process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH === 'true'
  if (isClientAuthDisabled) {
    console.warn('[Vite DevTools] Client authentication is disabled. Any browser can connect to the devtools and access to your server and filesystem.')
  }

  const preset = createWsRpcPreset({
    port,
    host,
    onConnected: (ws, req, meta) => {
      const url = new URL(req.url ?? '', 'http://localhost')
      const authId = url.searchParams.get('vite_devtools_auth_id') ?? undefined
      if (isClientAuthDisabled) {
        meta.isTrusted = true
      }
      else if (authId && contextInternal.storage.auth.value().trusted[authId]) {
        meta.isTrusted = true
        meta.clientAuthId = authId
      }

      wsClients.add(ws)
      const color = meta.isTrusted ? c.green : c.yellow
      console.log(color`${MARK_INFO} Websocket client connected. [${meta.id}] [${meta.clientAuthId}] (${meta.isTrusted ? 'trusted' : 'untrusted'})`)
    },
    onDisconnected: (ws, meta) => {
      wsClients.delete(ws)
      console.log(c.red`${MARK_INFO} Websocket client disconnected. [${meta.id}]`)
    },
  })

  const asyncStorage = new AsyncLocalStorage<DevToolsNodeRpcSession>()

  const rpcGroup = createRpcServer<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions>(
    rpcHost.functions,
    {
      preset,
      rpcOptions: {
        onFunctionError(error, name) {
          console.error(c.red`⬢ RPC error on executing "${c.bold(name)}":`)
          console.error(error)
        },
        onGeneralError(error) {
          console.error(c.red`⬢ RPC error on executing rpc`)
          console.error(error)
        },
        resolver(name, fn) {
          // eslint-disable-next-line ts/no-this-alias
          const rpc = this

          // Block unauthorized access to non-anonymous methods
          if (!name.startsWith(ANONYMOUS_SCOPE) && !rpc.$meta.isTrusted) {
            return () => {
              throw new Error(`Unauthorized access to method ${JSON.stringify(name)} from client [${rpc.$meta.id}]`)
            }
          }

          // If the function is not found, return undefined
          if (!fn)
            return undefined

          // Register AsyncContext for the current RPC call
          return async function (this: any, ...args) {
            debugInvoked(`${JSON.stringify(name)} from #${rpc.$meta.id}`)
            return await asyncStorage.run({
              rpc,
              meta: rpc.$meta,
            }, async () => {
              return (await fn).apply(this, args)
            })
          }
        },
      },
    },
  )

  rpcHost._rpcGroup = rpcGroup
  rpcHost._asyncStorage = asyncStorage

  const getConnectionMeta = async (): Promise<ConnectionMeta> => {
    return {
      backend: 'websocket',
      websocket: port,
    }
  }

  return {
    port,
    rpc: rpcGroup,
    rpcHost,
    getConnectionMeta,
  }
}
