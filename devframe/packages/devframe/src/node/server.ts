import type { BirpcGroup } from 'birpc'
import type { DevToolsNodeContext, DevToolsNodeRpcSession, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from 'devframe/types'
import type { App } from 'h3'
import type { WebSocketServer } from 'ws'
import type { RpcFunctionsHost } from './host-functions'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createServer } from 'node:http'
import { createRpcServer } from 'devframe/rpc/server'
import { attachWsRpcTransport } from 'devframe/rpc/transports/ws-server'
import { createApp, toNodeListener } from 'h3'
import { WebSocketServer as WSServer } from 'ws'

export interface StartHttpAndWsOptions {
  context: DevToolsNodeContext
  host?: string
  port: number
  /**
   * Optional h3 app to mount on. When omitted a fresh one is created;
   * when provided, callers can add their own routes (static handlers,
   * auth middleware, etc.) first.
   */
  app?: App
  /**
   * When `false`, the RPC server is started without a trust handshake.
   * Intended for single-user localhost tools where an auth round-trip
   * would only get in the way. The Vite-flavoured auth layer in
   * `@vitejs/devtools` already honors the equivalent
   * `devtools.clientAuth` setting; devframe records the intent here so
   * future auth plumbing can consult it without another API change.
   *
   * Default: `true`.
   */
  auth?: boolean
  /**
   * Called once the WS server is bound so callers can mount static
   * handlers whose origin depends on the resolved port, or print their
   * own startup banner. Devframe does not print one itself.
   */
  onReady?: (info: { origin: string, port: number, app: App }) => void | Promise<void>
}

export interface StartedServer {
  /** Listening origin, e.g. `http://localhost:9999`. */
  origin: string
  port: number
  app: App
  wss: WebSocketServer
  rpcGroup: BirpcGroup<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions, false>
  close: () => Promise<void>
}

/**
 * Compose an h3 + WebSocket server for a devframe context. The RPC
 * group is bound to `context.rpc.functions`; the WS endpoint lives on
 * the same port as the HTTP server.
 */
export async function startHttpAndWs(options: StartHttpAndWsOptions): Promise<StartedServer> {
  const { context, port } = options
  const bindHost = options.host ?? 'localhost'
  const app = options.app ?? createApp()
  const httpServer = createServer(toNodeListener(app))
  const wss = new WSServer({ server: httpServer })
  const rpcHost = context.rpc as unknown as RpcFunctionsHost

  const asyncStorage = new AsyncLocalStorage<DevToolsNodeRpcSession>()

  const rpcGroup = createRpcServer<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions>(
    rpcHost.functions,
    {
      rpcOptions: {
        // Wrap each RPC handler in an AsyncLocalStorage context so
        // `ctx.rpc.getCurrentRpcSession()` works inside handlers (used
        // by streaming subscribe/unsubscribe/cancel and shared-state
        // sync). Mirrors `packages/core/src/node/ws.ts`'s resolver,
        // minus the auth gate (devframe defers auth to its host
        // adapters; the standalone CLI server is unauthenticated).
        resolver(name, fn) {
          // eslint-disable-next-line ts/no-this-alias
          const rpc = this
          if (!fn)
            return undefined
          return async function (this: any, ...args) {
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

  attachWsRpcTransport(rpcGroup, {
    wss,
    onDisconnected: (_ws, meta) => {
      rpcHost._emitSessionDisconnected(meta)
    },
  })

  ;(rpcHost as any)._rpcGroup = rpcGroup
  ;(rpcHost as any)._asyncStorage = asyncStorage
  ;(rpcHost as any)._authDisabled = options.auth === false

  // The browser client unconditionally calls `vite:anonymous:auth` on
  // connect (see `client/rpc-ws.ts`). When `auth: false` is set on the
  // standalone server, register a noop handler that auto-trusts so the
  // client's hardcoded handshake succeeds. The Vite-side adapter
  // registers the real handler with the same name; the two paths never
  // overlap because Vite consumers never opt into `auth: false`.
  if (options.auth === false && !rpcHost.definitions.has('vite:anonymous:auth')) {
    rpcHost.register({
      name: 'vite:anonymous:auth',
      type: 'action',
      handler: () => {
        const session = rpcHost.getCurrentRpcSession()
        if (session)
          session.meta.isTrusted = true
        return { isTrusted: true }
      },
    })
  }

  await new Promise<void>((resolveListen) => {
    httpServer.listen(port, bindHost, () => resolveListen())
  })

  const origin = `http://${bindHost}:${port}`

  if (options.onReady)
    await options.onReady({ origin, port, app })

  return {
    origin,
    port,
    app,
    wss,
    rpcGroup,
    async close() {
      // `wss.close` only stops accepting new connections — existing ones
      // would keep the close callback pending until they disconnect on
      // their own. Force-terminate so callers can deterministically tear
      // the server down (tests, hot reload, graceful shutdown).
      for (const ws of wss.clients) ws.terminate()
      await new Promise<void>(r => wss.close(() => r()))
      await new Promise<void>(r => httpServer.close(() => r()))
    },
  }
}
