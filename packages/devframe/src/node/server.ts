/* eslint-disable no-console */
import type { BirpcGroup } from 'birpc'
import type { DevToolsNodeContext, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from 'devframe/types'
import type { App } from 'h3'
import type { WebSocketServer } from 'ws'
import type { RpcFunctionsHost } from './host-functions'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createServer } from 'node:http'
import c from 'ansis'
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
   * Called once the WS server is bound so callers can mount static
   * handlers whose origin depends on the resolved port.
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

  await new Promise<void>((resolveListen) => {
    httpServer.listen(port, bindHost, () => resolveListen())
  })

  const origin = `http://${bindHost}:${port}`
  console.log(c.green`[devframe] ws + http listening on ${origin}`)

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
