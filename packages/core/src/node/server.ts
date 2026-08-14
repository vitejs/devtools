import type { HubInstance } from '@devframes/hub/initiate'
import type { ConnectionMeta, ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ViteDevToolsHost } from '@vitejs/devtools-kit/node'
import type { Server as NodeHttpServer } from 'node:http'
import type { DevToolsConfig } from './config'
import process from 'node:process'
import { initHub } from '@devframes/hub/initiate'
import { jsonRenderUiRenderer } from '@devframes/json-render-ui/hub'
import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { getAuthHandler } from './auth-handler'
import { createViteDevToolsUi } from './ui'

export interface CreateDevToolsHubOptions {
  context: ViteDevToolsNodeContext
  /**
   * Share this node HTTP server for the WebSocket upgrade (the embedded Vite
   * dev server). The socket binds route-bound at `<base>__ws`, so no extra
   * port opens — proxy-friendly. When absent, a side-car WS server is used.
   */
  server?: NodeHttpServer
  /** Bind host for a dedicated side-car WS server (standalone, no shared server). */
  host?: string
  /** Pin the side-car WS port (standalone); auto-allocated when omitted. */
  wsPort?: number
}

export interface DevToolsHub {
  hub: HubInstance
  /** Connect/Express-style middleware over the whole DevTools surface. */
  middleware: HubInstance['nodeMiddleware']
  getConnectionMeta: () => ConnectionMeta
  close: () => Promise<void>
}

/**
 * Stand up the DevTools client + RPC surface as a devframe hub instance
 * (`initHub`). The hub serves the branded `@devframes/hub-ui` viewer and its
 * embedded bootstrap (the `ui` slot), the RPC connection meta, and the shared
 * WebSocket transport — all under the kit-pinned `/__devtools/` base. Vite
 * DevTools supplies its own already-assembled kit context, so the hub runs in
 * "bring your own context" mode and only owns the hub-level endpoints; each
 * mounted devframe (Rolldown, Vite, …) keeps serving its own SPA at its own
 * base and gets its `__connection.json` from {@link provideConnectionMeta}.
 */
export async function createDevToolsHub(options: CreateDevToolsHubOptions): Promise<DevToolsHub> {
  const { context } = options

  // Mirror the WS trust posture the bespoke transport used: skip the OTP gate
  // in build snapshots, when the user opts out, or via the escape-hatch env.
  const authDisabled = context.mode === 'build'
    || context.viteConfig.devtools?.config?.clientAuth === false
    || process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH === 'true'

  // Vite's published types bundle a frozen `DevToolsConfig` snapshot, so a
  // field added here isn't visible through `config` until Vite re-vendors it.
  const allowedOrigins = (context.viteConfig.devtools?.config as DevToolsConfig | undefined)?.allowedOrigins

  const hub = initHub({
    base: DEVTOOLS_MOUNT_PATH,
    context,
    ui: createViteDevToolsUi(),
    // Serve + advertise the reference json-render frontend so `json-render`
    // docks (kit's `createJsonRenderer`, the git/data-inspector devframes)
    // render instead of hub-ui's missing-renderer fallback.
    renderers: [jsonRenderUiRenderer()],
    auth: authDisabled ? false : getAuthHandler(context),
    ...(allowedOrigins ? { allowedOrigins } : {}),
    ...(options.server
      ? { server: options.server }
      : { ws: options.wsPort != null ? { port: options.wsPort } : { sidecar: true } }),
    ...(options.host ? { host: options.host } : {}),
  })

  await hub.ready

  const getConnectionMeta = (): ConnectionMeta => hub.connectionMeta()

  // Hand the host the live connection-meta getter so each mounted devframe's
  // `mountConnectionMeta` middleware serves it at the devframe's own base.
  ;(context.host as ViteDevToolsHost).provideConnectionMeta?.(getConnectionMeta)

  return {
    hub,
    middleware: hub.nodeMiddleware,
    getConnectionMeta,
    close: hub.close,
  }
}
