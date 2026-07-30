import type { ViteDevToolsHost } from '@vitejs/devtools-kit/node'
import type { NodeHandler } from 'h3'
import type { CreateWsServerOptions } from './ws'
import { DEVTOOLS_CONNECTION_META_FILENAME } from '@vitejs/devtools-kit/constants'
import { mountStaticHandler } from 'devframe/utils/serve-static'
import { defineHandler, H3, readBody, toNodeHandler } from 'h3'
import { DEVTOOLS_MODE_FILENAME } from '../constants'
import { dirClientStandalone } from '../dirs'
import { setNormalMode } from './passive-mode'
import { createWsServer } from './ws'

export interface DevToolsMiddleware {
  h3: H3
  rpc: Awaited<ReturnType<typeof createWsServer>>['rpc']
  middleware: NodeHandler
  getConnectionMeta: Awaited<ReturnType<typeof createWsServer>>['getConnectionMeta']
}

export async function createDevToolsMiddleware(options: CreateWsServerOptions): Promise<DevToolsMiddleware> {
  const h3 = new H3()

  const { rpc, getConnectionMeta, registerBrowserExtensionOrigin } = await createWsServer(options)

  // Hand the host the live connection-meta getter so each mounted devframe's
  // `mountConnectionMeta` middleware can serve it at the devframe's own base
  // (the getter didn't exist yet when the host was created, before the WS
  // server allocated its endpoint).
  ;(options.context.host as ViteDevToolsHost).provideConnectionMeta?.(getConnectionMeta)

  h3.use(`/${DEVTOOLS_CONNECTION_META_FILENAME}`, defineHandler(async (event) => {
    const requestOrigin = event.req.headers.get('origin') ?? undefined
    const registrationOrigin = new URL(event.req.url, 'http://localhost')
      .searchParams
      .get('browser-extension-origin') ?? undefined
    // A browser extension cannot override the Origin of its own WebSocket.
    // Its metadata bootstrap therefore sends the panel origin explicitly:
    // extension fetches do not consistently include an Origin header. Client
    // auth still protects every non-anonymous RPC method.
    registerBrowserExtensionOrigin(registrationOrigin)
    if (requestOrigin && registerBrowserExtensionOrigin(requestOrigin)) {
      event.res.headers.set('Access-Control-Allow-Origin', requestOrigin)
      event.res.headers.set('Vary', 'Origin')
    }
    event.res.headers.set('Cache-Control', 'no-store')
    event.res.headers.set('Content-Type', 'application/json')
    return JSON.stringify(await getConnectionMeta())
  }))

  // Passive-mode persistence. `POST { enabled }` flips the per-project "normal
  // mode" flag in node_modules; the injection plugin reads that flag when it
  // decides which client entry to inject on the next load. Served
  // unauthenticated because it only writes a local marker file — the docks
  // themselves still require WS trust to surface any project data.
  h3.use(`/${DEVTOOLS_MODE_FILENAME}`, defineHandler(async (event) => {
    if (event.req.method !== 'POST') {
      event.res.status = 405
      return ''
    }
    const body = (await readBody(event).catch(() => undefined)) as { enabled?: boolean } | undefined
    setNormalMode(options.cwd, body?.enabled ?? true)
    event.res.headers.set('Content-Type', 'application/json')
    return JSON.stringify({ ok: true })
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
