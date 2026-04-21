/* eslint-disable no-console */
import type { ConnectionMeta, DevToolsNodeContext, DevToolsNodeRpcSession, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import type { PeerDescriptor } from '@vitejs/devtools-rpc/peer'
import type { WebSocket } from 'ws'
import type { RpcFunctionsHost } from './host-functions'
import { AsyncLocalStorage } from 'node:async_hooks'
import process from 'node:process'
import { PeerMesh } from '@vitejs/devtools-rpc/peer'
import { createWsServerAdapter } from '@vitejs/devtools-rpc/peer/adapters/ws-server'
import { createRpcServer } from '@vitejs/devtools-rpc/server'
import c from 'ansis'
import { getPort } from 'get-port-please'
import { createDebug } from 'obug'
import { MARK_INFO } from './constants'
import { getInternalContext } from './context-internal'
import { logger } from './diagnostics'

const debugInvoked = createDebug('vite:devtools:rpc:invoked')

export interface CreateWsServerOptions {
  cwd: string
  websocket: {
    port?: number
    host: string
    https?: DevToolsNodeContext['viteConfig']['server']['https'] | false
  }
  base?: string
  context: DevToolsNodeContext
}

const ANONYMOUS_SCOPE = 'vite:anonymous:'
const DEVTOOLS_SERVER_PEER_ID = 'devtools-server'

export async function createWsServer(options: CreateWsServerOptions) {
  const rpcHost = options.context.rpc as unknown as RpcFunctionsHost
  const host = options.websocket.host
  const https = options.websocket.https === false ? undefined : (options.websocket.https ?? options.context.viteConfig.server.https)
  const port = options.websocket.port ?? await getPort({ port: 7812, host, random: true })!

  const wsClients = new Set<WebSocket>()

  const context = options.context
  const contextInternal = getInternalContext(context)

  const isClientAuthDisabled = context.mode === 'build' || context.viteConfig.devtools?.config?.clientAuth === false || process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH === 'true'
  if (isClientAuthDisabled) {
    logger.DTK0008().log()
  }

  const asyncStorage = new AsyncLocalStorage<DevToolsNodeRpcSession>()

  const rpcGroup = createRpcServer<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions>(
    rpcHost.functions,
    {
      // The ws-server adapter manages channels, so the preset is a no-op.
      preset: () => {},
      rpcOptions: {
        onFunctionError(error, name) {
          logger.DTK0011({ name }, { cause: error }).log()
        },
        onGeneralError(error) {
          logger.DTK0012({ cause: error }).log()
        },
        resolver(name, fn) {
          // eslint-disable-next-line ts/no-this-alias
          const rpc = this

          // Block unauthorized access to non-anonymous methods
          if (!name.startsWith(ANONYMOUS_SCOPE) && !rpc.$meta.isTrusted) {
            return () => {
              throw logger.DTK0013({ name, clientId: rpc.$meta.id }).throw()
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

  const mesh = new PeerMesh({
    self: {
      id: DEVTOOLS_SERVER_PEER_ID,
      role: 'devtools-server',
      capabilities: ['rpc-relay', 'directory'],
      meta: { mode: context.mode, port },
      links: [{ transport: 'ws', priority: 100 }],
    },
  })

  const wsAdapter = createWsServerAdapter<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions>({
    port,
    host,
    https,
    rpcGroup,
    resolvePeer: (req, meta) => {
      const url = new URL(req.url ?? '', 'http://localhost')
      const authToken = url.searchParams.get('vite_devtools_auth_token') ?? undefined
      if (isClientAuthDisabled) {
        meta.isTrusted = true
      }
      else if (authToken && contextInternal.storage.auth.value().trusted[authToken]) {
        meta.isTrusted = true
        meta.clientAuthToken = authToken
      }
      else if (authToken && (context.viteConfig.devtools?.config?.clientAuthTokens ?? []).includes(authToken)) {
        meta.isTrusted = true
        meta.clientAuthToken = authToken
      }

      const descriptor: PeerDescriptor = {
        id: authToken ? `peer:${authToken}` : `peer:session-${meta.id}`,
        role: 'client:unknown',
        capabilities: [],
        meta: {
          sessionId: meta.id,
          authToken: meta.clientAuthToken,
          isTrusted: !!meta.isTrusted,
        },
        links: [{ transport: 'ws', priority: 100 }],
      }
      return descriptor
    },
    onConnected: (ws, _req, meta) => {
      wsClients.add(ws)
      const color = meta.isTrusted ? c.green : c.yellow
      console.log(color`${MARK_INFO} Websocket client connected. [${meta.id}] [${meta.clientAuthToken}] (${meta.isTrusted ? 'trusted' : 'untrusted'})`)
    },
    onDisconnected: (ws, meta) => {
      wsClients.delete(ws)
      console.log(c.red`${MARK_INFO} Websocket client disconnected. [${meta.id}]`)
    },
  })

  await mesh.register(wsAdapter)

  rpcHost._rpcGroup = rpcGroup
  rpcHost._asyncStorage = asyncStorage
  rpcHost._mesh = mesh

  // Broadcast directory changes to all connected peers so they can maintain
  // a local replica of the directory. The peer whose entry changed is
  // excluded — it already knows its own state.
  mesh.directory.onChange((kind, peer) => {
    if (peer.id === mesh.self.id)
      return
    void rpcHost.broadcast({
      method: 'devtoolskit:internal:peer:directory-delta',
      args: [{ kind, peer }],
      event: true,
      optional: true,
      filter: (client) => {
        const meta = client.$meta as { peerId?: string } | undefined
        return meta?.peerId !== peer.id
      },
    })
  })

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
    mesh,
    getConnectionMeta,
  }
}
