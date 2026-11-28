import type { DevframeHost, DevframeStorageScope } from 'devframe/types'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { ConnectionMeta } from '../types'
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
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
  /**
   * Where earlier kit versions kept each scope. Adapters that persist files
   * through `getStorageDir` can offer a one-time import from here.
   */
  getLegacyStorageDir: (scope: DevframeStorageScope) => string
  /**
   * Move workspace-scoped data written by earlier kit versions into its current
   * directory. Idempotent, and safe to call on every start: it only ever reads
   * the legacy workspace directory, which is where those versions put shared
   * data.
   */
  migrateStorage: () => void
}

/**
 * Move everything under `legacyDir` into `targetDir`, then drop the legacy dir.
 *
 * The rename to `<legacyDir>.migrating` is the claim: it is atomic, so a
 * concurrent process (or a second call) finds neither name and returns instead
 * of moving the same entries twice. A renamed-but-unfinished directory is picked
 * up by the next call, so an interrupted run resumes.
 *
 * Entries that already exist in `targetDir` win, since they were written by the
 * newer layout and are the only copy the user has touched.
 */
function migrateDirectory(legacyDir: string, targetDir: string): void {
  const claimed = `${legacyDir}.migrating`
  if (!existsSync(claimed)) {
    if (!existsSync(legacyDir))
      return
    try {
      renameSync(legacyDir, claimed)
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return
      throw error
    }
  }

  const entries = readdirSync(claimed)
  if (entries.length)
    mkdirSync(targetDir, { recursive: true })
  for (const entry of entries)
    mergeEntry(join(claimed, entry), join(targetDir, entry))
  rmSync(claimed, { recursive: true, force: true })
}

function mergeEntry(from: string, to: string): void {
  if (!existsSync(to)) {
    renameSync(from, to)
    return
  }
  if (!statSync(from).isDirectory() || !statSync(to).isDirectory())
    return
  for (const entry of readdirSync(from))
    mergeEntry(join(from, entry), join(to, entry))
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

  /**
   * Mirror devframe's storage layout: `workspace` is committable and
   * team-shared, `project` rotates with the checkout's `node_modules`, and
   * `global` is per-user. Each scope needs its own directory, or a
   * per-checkout file lands where every other project reads it.
   *
   * `project` deliberately avoids `<workspaceRoot>/node_modules/.vite/devtools`,
   * where every earlier version looked for workspace data. Keeping it a fresh
   * path means the one-time migration of that directory cannot pick up private
   * writes, whenever it runs.
   *
   * `workspace` deliberately avoids `<workspaceRoot>/.vite-devtools`, which is
   * the CLI's default build `outDir` and gets wiped by every build.
   */
  const storageDirs: Record<DevframeStorageScope, string> = {
    workspace: join(workspaceRoot, '.vite/devtools'),
    project: join(workspaceRoot, 'node_modules/.vite-devtools'),
    global: join(homedir(), '.vite/devtools'),
  }

  /**
   * Where earlier kit versions kept each scope, for adapters that want to offer
   * their own one-time import. `workspace` moved out of `node_modules` and
   * `project` moved out of the per-user directory, so both have a legacy path.
   * `global` never moved.
   */
  const legacyStorageDirs: Record<DevframeStorageScope, string> = {
    workspace: join(workspaceRoot, 'node_modules/.vite/devtools'),
    project: storageDirs.global,
    global: storageDirs.global,
  }

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
      if (resolved) {
        try {
          return new URL(resolved).origin
        }
        catch {
          // `resolvedUrls` comes from the server, so a host or proxy plugin can
          // put anything here. Fall through to the config-derived origin instead
          // of throwing on a value we cannot parse.
        }
      }
      const https = !!viteConfig.server.https
      const host = typeof viteConfig.server.host === 'string' ? viteConfig.server.host : 'localhost'
      const port = viteConfig.server.port ?? (https ? 443 : 80)
      const reachable = host === '0.0.0.0' || host === '::' || !host ? 'localhost' : host
      return `${https ? 'https' : 'http'}://${reachable}:${port}`
    },
    getStorageDir(scope) {
      return storageDirs[scope]
    },
    getLegacyStorageDir(scope) {
      return legacyStorageDirs[scope]
    },
    migrateStorage() {
      migrateDirectory(legacyStorageDirs.workspace, storageDirs.workspace)
    },
  }
}
