import type { HubInstance } from '@devframes/hub/initiate'
import type { ConnectionMeta, DockRendererRegistration, ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ViteDevToolsHost } from '@vitejs/devtools-kit/node'
import type { Server as NodeHttpServer } from 'node:http'
import type { DevToolsConfig } from './config'
import type { ViteDevToolsUiOptions } from './ui'
import { initHub } from '@devframes/hub/initiate'
import { DEVTOOLS_CONNECTION_META_FILENAME, DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { getAuthHandler, getBuildCapabilityToken, isBuildCapabilityAuth, isClientAuthDisabled } from './auth-handler'
import { resolveDockRendererRegistrations } from './renderers'
import { createViteDevToolsUi } from './ui'

export interface CreateDevToolsHubOptions {
  context: ViteDevToolsNodeContext
  /** Dock renderer modules served by the hub, replacing built-ins by matching type. */
  renderers?: readonly DockRendererRegistration[]
  /**
   * Reference-UI options forwarded to `createUi` — the embedded dock's
   * reveal policy and the dock-bar rendering preferences.
   */
  ui?: ViteDevToolsUiOptions
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

/** Absolute path of the hub's top-level connection meta (`/__devtools/__connection.json`). */
const CONNECTION_META_PATH = `${DEVTOOLS_MOUNT_PATH}${DEVTOOLS_CONNECTION_META_FILENAME}`

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

  // Mirror the WS trust posture the context uses: fully skip the auth gate
  // only on an explicit opt-out or the escape-hatch env. Must agree with
  // `createDevToolsContext`'s registration guard (same helper) — see
  // `isClientAuthDisabled` for why.
  const authDisabled = isClientAuthDisabled(context)

  // Implicit build mode keeps the gate installed but trusts via an unguessable
  // per-process capability token instead of a prompt. The token is baked into
  // the served connection metadata's `authToken` so the same-origin build
  // viewer presents it automatically; a cross-origin page can't read that
  // metadata, so it never learns the token. See `isBuildCapabilityAuth`.
  const capabilityToken = isBuildCapabilityAuth(context)
    ? getBuildCapabilityToken(context)
    : undefined

  // Vite's published types bundle a frozen `DevToolsConfig` snapshot, so a
  // field added here isn't visible through `config` until Vite re-vendors it.
  const allowedOrigins = (context.viteConfig.devtools?.config as DevToolsConfig | undefined)?.allowedOrigins

  const hub = initHub({
    base: DEVTOOLS_MOUNT_PATH,
    context,
    ui: createViteDevToolsUi(options.ui),
    // Serve + advertise the reference json-render frontend so `json-render`
    // docks (kit's `createJsonRenderer`, the git/data-inspector devframes)
    // render instead of hub-ui's missing-renderer fallback.
    renderers: resolveDockRendererRegistrations(options.renderers),
    // With a live Vite dev server, route bare-specifier dock client scripts
    // (`ClientScriptEntry.importFrom` naming an npm module, e.g.
    // vue-tracer's `vite-plugin-vue-tracer/client/vite-devtools`) through
    // Vite's own `/@id/` resolution — so they load through the inspected
    // app's module graph now that v0.9's middleware serves hub assets ahead
    // of Vite's transform pipeline. Standalone (CLI) and build snapshots have
    // no module graph to resolve against, so the template stays undeclared
    // there and such scripts must ship a self-contained bundle URL instead.
    ...(context.viteServer ? { clientModuleResolution: '/@id/{specifier}' } : {}),
    auth: authDisabled ? false : getAuthHandler(context),
    ...(allowedOrigins ? { allowedOrigins } : {}),
    ...(options.server
      ? { server: options.server }
      : { ws: options.wsPort != null ? { port: options.wsPort } : { sidecar: true } }),
    ...(options.host ? { host: options.host } : {}),
  })

  await hub.ready

  // Bake the capability token into the emitted connection metadata so the
  // build viewer trusts the server on connect with no prompt.
  const getConnectionMeta = (): ConnectionMeta => (
    capabilityToken
      ? { ...hub.connectionMeta(), authToken: capabilityToken }
      : hub.connectionMeta()
  )

  // Hand the host the live connection-meta getter so each mounted devframe's
  // `mountConnectionMeta` middleware serves it at the devframe's own base.
  ;(context.host as ViteDevToolsHost).provideConnectionMeta?.(getConnectionMeta)

  // The hub serves its own top-level `__connection.json` (the viewer's meta)
  // from `hub.connectionMeta()`, which carries no `authToken`. In build-token
  // mode, intercept that one route and answer with the token-augmented meta so
  // the top-level viewer picks the token up too — everything else falls
  // through to the hub middleware untouched.
  const middleware: HubInstance['nodeMiddleware'] = capabilityToken
    ? (req, res, next) => {
        const path = req.url?.split('?', 1)[0]
        if (path === CONNECTION_META_PATH) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(getConnectionMeta()))
          return
        }
        hub.nodeMiddleware(req, res, next)
      }
    : hub.nodeMiddleware

  return {
    hub,
    middleware,
    getConnectionMeta,
    close: hub.close,
  }
}
