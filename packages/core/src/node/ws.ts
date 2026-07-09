/* eslint-disable no-console */
import type { ConnectionMeta, DevToolsNodeRpcSession, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { Peer } from 'crossws'
import type { RpcFunctionsHost } from 'devframe/node'
import type { WsRpcTransportOptions } from 'devframe/rpc/transports/ws-server'
import type { Server as NodeHttpServer } from 'node:http'
import { AsyncLocalStorage } from 'node:async_hooks'
import process from 'node:process'
import { DEVTOOLS_WS_PATH, DEVTOOLS_WS_ROUTE } from '@vitejs/devtools-kit/constants'
import { isAnonymousRpcMethod } from 'devframe/constants'
import { getInternalContext } from 'devframe/node/hub-internals'
import { createRpcServer } from 'devframe/rpc/server'
import { attachWsRpcTransport } from 'devframe/rpc/transports/ws-server'
import { colors as c } from 'devframe/utils/colors'
import { getPort } from 'get-port-please'
import { createDebug } from 'obug'
import { getAuthHandler } from './auth-handler'
import { MARK_INFO } from './constants'
import { diagnostics } from './diagnostics'
import { resolveHttpsConfig } from './https'

const debugInvoked = createDebug('vite:devtools:rpc:invoked')

export interface CreateWsServerOptions {
  cwd: string
  websocket: {
    port?: number
    host: string
    https?: ViteDevToolsNodeContext['viteConfig']['server']['https'] | false
  }
  base?: string
  context: ViteDevToolsNodeContext
}

function buildWsUrl({ host, port, https }: { host: string, port: number, https: boolean }): string {
  // 0.0.0.0 / :: / unspecified bindings listen on all interfaces, but a hosted
  // page can't dial into an unspecified address — substitute localhost so the
  // descriptor we hand out is dialable.
  const reachableHost = host === '0.0.0.0' || host === '::' || host === '' ? 'localhost' : host
  const protocol = https ? 'wss' : 'ws'
  return `${protocol}://${reachableHost}:${port}`
}

export async function createWsServer(options: CreateWsServerOptions) {
  const rpcHost = options.context.rpc as unknown as RpcFunctionsHost
  const host = options.websocket.host
  const https = await resolveHttpsConfig(options.websocket.https === false ? undefined : (options.websocket.https ?? options.context.viteConfig.server.https))

  const context = options.context
  const contextInternal = getInternalContext(context)
  const auth = getAuthHandler(context)

  // Route-bound mode: when embedded in a Vite dev server, share its HTTP server
  // and bind the RPC socket to a single upgrade path (`/__devtools/__ws`), so no
  // extra port is opened — nicer behind proxies and for HTTPS. Standalone/CLI has
  // no Vite server, so fall back to a dedicated WS port.
  // Vite types `httpServer` as a broader union (incl. http2); at dev runtime it
  // is a node http/https server that crossws can hook `upgrade` on.
  const viteHttpServer = (context.viteServer?.httpServer ?? undefined) as NodeHttpServer | undefined
  const routeBound = !!viteHttpServer
  const port = routeBound ? undefined : (options.websocket.port ?? await getPort({ port: 7812, host, random: true })!)

  const wsClients = new Set<Peer>()

  const isClientAuthDisabled = context.mode === 'build' || context.viteConfig.devtools?.config?.clientAuth === false || process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH === 'true'
  if (isClientAuthDisabled) {
    diagnostics.DTK0008()
  }

  contextInternal.wsEndpoint = {
    // Remote docks dial this absolute URL cross-origin. In route-bound mode it
    // points at the Vite origin + the WS path; otherwise at the dedicated port.
    url: routeBound
      ? `${context.host.resolveOrigin().replace(/^http/, 'ws')}${DEVTOOLS_WS_PATH}`
      : buildWsUrl({ host, port: port!, https: !!https }),
  }

  // `docks.register()` runs before the WS port is allocated, so any remote
  // docks registered during plugin setup were projected without a connection
  // descriptor. Now that the endpoint is resolved, re-emit their update events
  // so the shared-state consumers pick up the enriched URLs.
  for (const view of context.docks.views.values()) {
    if (view.type === 'iframe' && view.remote) {
      context.docks.events.emit('dock:entry:updated', view)
    }
  }

  const asyncStorage = new AsyncLocalStorage<DevToolsNodeRpcSession>()

  const rpcGroup = createRpcServer<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions>(
    rpcHost.functions,
    {
      rpcOptions: {
        onFunctionError(error, name) {
          diagnostics.DTK0011({ name, cause: error })
        },
        onGeneralError(error) {
          diagnostics.DTK0012({ cause: error })
        },
        resolver(name, fn) {
          // eslint-disable-next-line ts/no-this-alias
          const rpc = this

          // Only `anonymous:`-prefixed methods (the auth handshake) are
          // reachable before the session is trusted.
          if (!isAnonymousRpcMethod(name) && !rpc.$meta.isTrusted) {
            return () => {
              throw diagnostics.DTK0013({ name, clientId: rpc.$meta.id })
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

  // Share Vite's server on a scoped path (leaving its HMR upgrades untouched),
  // or open a dedicated WS server when running standalone.
  const binding: WsRpcTransportOptions = routeBound
    ? { server: viteHttpServer, path: DEVTOOLS_WS_PATH, destroyUnmatched: false }
    : { port: port!, host, https }

  attachWsRpcTransport(rpcGroup, {
    ...binding,
    definitions: rpcHost.definitions,
    onConnected: (peer, meta) => {
      // crossws exposes the upgrade request (with its query string + headers)
      // on the peer, replacing the raw `ws`/`req` pair from the old transport.
      const url = new URL(peer.request?.url ?? '', 'http://localhost')
      const authToken = url.searchParams.get('devframe_auth_token') ?? undefined
      const requestOrigin = peer.request?.headers.get('origin') ?? undefined
      if (isClientAuthDisabled) {
        meta.isTrusted = true
      }
      else if (authToken && contextInternal.isRemoteTokenTrusted(authToken, requestOrigin)) {
        meta.isTrusted = true
        meta.clientAuthToken = authToken
      }
      else if (authToken && contextInternal.storage.auth.value().trusted[authToken]) {
        meta.isTrusted = true
        meta.clientAuthToken = authToken
      }
      else if (authToken && (context.viteConfig.devtools?.config?.clientAuthTokens ?? []).includes(authToken)) {
        meta.isTrusted = true
        meta.clientAuthToken = authToken
      }

      // Surface the one-time code + magic link so the user can authorize an
      // untrusted browser (idempotent per code).
      if (!meta.isTrusted)
        auth.printBanner()

      wsClients.add(peer)
      const color = meta.isTrusted ? c.green : c.yellow
      console.log(color`${MARK_INFO} Websocket client connected. [${meta.id}] [${meta.clientAuthToken}] (${meta.isTrusted ? 'trusted' : 'untrusted'})`)
    },
    onDisconnected: (peer, meta) => {
      wsClients.delete(peer)
      rpcHost._emitSessionDisconnected(meta)
      console.log(c.red`${MARK_INFO} Websocket client disconnected. [${meta.id}]`)
    },
  })

  rpcHost._rpcGroup = rpcGroup
  rpcHost._asyncStorage = asyncStorage

  const getConnectionMeta = async (): Promise<ConnectionMeta> => {
    const jsonSerializableMethods: string[] = []
    for (const def of rpcHost.definitions.values()) {
      if (def.jsonSerializable === true)
        jsonSerializableMethods.push(def.name)
    }
    return {
      backend: 'websocket',
      // Relative path resolves against `/__devtools/__connection.json` on the
      // client (proxy-safe); the dedicated-port form is a bare port number.
      websocket: routeBound ? { path: DEVTOOLS_WS_ROUTE } : port!,
      jsonSerializableMethods,
    }
  }

  return {
    port,
    rpc: rpcGroup,
    rpcHost,
    getConnectionMeta,
  }
}
