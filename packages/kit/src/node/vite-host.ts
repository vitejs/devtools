import type { DevframeHost } from 'devframe/types'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { ConnectionMeta } from '../types'
import { homedir } from 'node:os'
import { join, posix } from 'node:path'
import { serveStaticNodeMiddleware } from 'devframe/utils/serve-static'
import { DEVTOOLS_CONNECTION_META_FILENAME, DEVTOOLS_WS_PATH } from '../constants'
import { diagnostics } from './diagnostics'

export interface CreateViteDevToolsHostOptions {
  viteConfig: ResolvedConfig
  viteServer?: ViteDevServer
  /**
   * Workspace root used as the parent of the per-project storage
   * directory. Threaded in by the consumer (typically resolved via
   * `searchForWorkspaceRoot`). Defaults to `viteConfig.root`.
   */
  workspaceRoot?: string
}

/**
 * The Vite DevTools host, extended with {@link ViteDevToolsHost.provideConnectionMeta}
 * so the caller can hand the host a live connection-meta getter once the RPC/WS
 * server exists (it doesn't yet when the host is created).
 */
export interface ViteDevToolsHost extends DevframeHost {
  /**
   * Supply the getter that resolves the current RPC connection meta. The
   * `mountConnectionMeta` middleware calls it lazily (at request time), so the
   * host can be created before the WS server allocates its endpoint.
   */
  provideConnectionMeta: (getter: () => ConnectionMeta | Promise<ConnectionMeta>) => void
}

/**
 * Rewrite a route-bound (relative-`__ws`) connection meta so it stays dialable
 * when served from a devframe's own base (e.g. `/__devframes-plugin-terminals/`)
 * instead of `/__devtools/`. The client resolves `websocket.path` against the
 * URL it fetched `__connection.json` from, so a bare `__ws` would resolve to the
 * devframe's base, not the shared WS route. Recomputing it as a base-relative
 * path keeps the endpoint pointing at `/__devtools/__ws` while staying
 * proxy-safe (no server-baked origin).
 */
function rewriteWebsocketForBase(meta: ConnectionMeta, base: string): ConnectionMeta {
  const ws = meta.websocket
  // Only the route-bound object form (relative path, no explicit host/port)
  // needs rebasing; a dedicated-port descriptor is already origin-absolute.
  if (ws && typeof ws === 'object' && ws.path != null && ws.host == null && ws.port == null) {
    // URL paths are always posix; `posix.relative` keeps the `/` separators
    // (`path.relative` would use `\` on Windows).
    return { ...meta, websocket: { ...ws, path: posix.relative(base, DEVTOOLS_WS_PATH) } }
  }
  return meta
}

export function createViteDevToolsHost(options: CreateViteDevToolsHostOptions): ViteDevToolsHost {
  const { viteConfig, viteServer } = options
  const workspaceRoot = options.workspaceRoot ?? viteConfig.root

  let connectionMetaGetter: (() => ConnectionMeta | Promise<ConnectionMeta>) | undefined

  return {
    mountStatic(base, distDir) {
      // In build mode there is no dev server to mount middleware on;
      // static files are baked into the build output by createBuild.
      if (viteConfig.command !== 'serve')
        return
      if (!viteServer)
        throw new Error('viteServer is required to mount static assets in dev mode')
      viteServer.middlewares.use(base, serveStaticNodeMiddleware(distDir))
    },
    mountConnectionMeta(base) {
      // Serve the RPC connection meta at each mounted devframe's own base so its
      // SPA (a same-origin iframe) can discover the endpoint via its relative
      // `./__connection.json` fetch — without this, that fetch falls through the
      // devframe's static handler to Vite's HTML fallback and the SPA can never
      // connect (empty terminals, inspector stuck loading).
      //
      // Build mode has no dev server; its static snapshot bakes a
      // `{ backend: 'static' }` meta at each base instead.
      if (viteConfig.command !== 'serve' || !viteServer)
        return
      const route = `${base.replace(/\/$/, '')}/${DEVTOOLS_CONNECTION_META_FILENAME}`
      // The devframe static handler is registered first (at `base`) but calls
      // `next()` for extensioned paths like `.json`, so this handler still runs.
      viteServer.middlewares.use(route, async (_req, res) => {
        try {
          const meta: ConnectionMeta = connectionMetaGetter
            ? await connectionMetaGetter()
            : { backend: 'static' }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(rewriteWebsocketForBase(meta, base)))
        }
        catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Failed to resolve connection meta' }))
          diagnostics.DTK0051({ base, cause: error })
        }
      })
    },
    provideConnectionMeta(getter) {
      connectionMetaGetter = getter
    },
    resolveOrigin() {
      const resolved = viteServer?.resolvedUrls?.local?.[0]
      if (resolved)
        return new URL(resolved).origin
      const https = !!viteConfig.server.https
      const host = typeof viteConfig.server.host === 'string' ? viteConfig.server.host : 'localhost'
      const port = viteConfig.server.port ?? (https ? 443 : 80)
      const reachable = host === '0.0.0.0' || host === '::' || !host ? 'localhost' : host
      return `${https ? 'https' : 'http'}://${reachable}:${port}`
    },
    getStorageDir(scope) {
      return scope === 'workspace'
        ? join(workspaceRoot, 'node_modules/.vite/devtools')
        : join(homedir(), '.vite/devtools')
    },
  }
}
