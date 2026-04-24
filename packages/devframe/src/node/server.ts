import type { BirpcGroup } from 'birpc'
import type { DevToolsNodeContext, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from 'devframe/types'
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
   * when provided, callers can add their own routes (sirv etc.) first.
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
 * Compose an h3 + WebSocket server for a devtool context. The RPC
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

  const asyncStorage = new AsyncLocalStorage<unknown>()

  const rpcGroup = createRpcServer<DevToolsRpcClientFunctions, DevToolsRpcServerFunctions>(
    rpcHost.functions,
  )

  attachWsRpcTransport(rpcGroup, { wss })

  ;(rpcHost as any)._rpcGroup = rpcGroup
  ;(rpcHost as any)._asyncStorage = asyncStorage
  ;(rpcHost as any)._authDisabled = options.auth === false

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
      await new Promise<void>(r => wss.close(() => r()))
      await new Promise<void>(r => httpServer.close(() => r()))
    },
  }
}
