import type { ViteDevToolsHost } from '@vitejs/devtools-kit/node'
import type { NodeHandler } from 'h3'
import type { CreateWsServerOptions } from './ws'
import { DEVTOOLS_CONNECTION_META_FILENAME } from '@vitejs/devtools-kit/constants'
import { mountStaticHandler } from 'devframe/utils/serve-static'
import { defineHandler, H3, toNodeHandler } from 'h3'
import { dirClientStandalone } from '../dirs'
import { createWsServer } from './ws'

export interface DevToolsMiddleware {
  h3: H3
  rpc: Awaited<ReturnType<typeof createWsServer>>['rpc']
  middleware: NodeHandler
  getConnectionMeta: Awaited<ReturnType<typeof createWsServer>>['getConnectionMeta']
}

export async function createDevToolsMiddleware(options: CreateWsServerOptions): Promise<DevToolsMiddleware> {
  const h3 = new H3()

  const { rpc, getConnectionMeta } = await createWsServer(options)

  // Hand the host the live connection-meta getter so each mounted devframe's
  // `mountConnectionMeta` middleware can serve it at the devframe's own base
  // (the getter didn't exist yet when the host was created, before the WS
  // server allocated its endpoint).
  ;(options.context.host as ViteDevToolsHost).provideConnectionMeta?.(getConnectionMeta)

  h3.use(`/${DEVTOOLS_CONNECTION_META_FILENAME}`, defineHandler(async (event) => {
    event.res.headers.set('Content-Type', 'application/json')
    return JSON.stringify(await getConnectionMeta())
  }))

  // Authentication uses the devframe OTP model (see `node/auth-handler.ts`):
  // an untrusted client is shown a one-time code in the terminal which it
  // exchanges via `anonymous:devframe:auth:exchange`, or opens the
  // `?devframe_otp=` magic link the client consumes on load — no auth page here.

  mountStaticHandler(h3, '', dirClientStandalone)

  return {
    h3,
    rpc,
    middleware: toNodeHandler(h3),
    getConnectionMeta,
  }
}
