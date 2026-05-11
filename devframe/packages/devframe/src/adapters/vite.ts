import type { DevframeDefinition } from '../types/devframe'
import { resolve } from 'pathe'
import { DEVTOOLS_CONNECTION_META_FILENAME } from '../constants'
import { logger } from '../node/diagnostics'
import { serveStaticNodeMiddleware } from '../utils/serve-static'
import { resolveBasePath } from './_shared'
import { createDevServer, resolveDevServerPort } from './dev'

export interface CreateVitePluginOptions {
  /**
   * Mount base. Defaults to `def.basePath ?? '/__<id>/'` for this hosted
   * adapter — the devframe shares the origin with the host Vite app.
   *
   * Relative spellings like `'./'` (common for base-agnostic Nuxt builds)
   * are normalized to absolute paths so they compose with Vite's connect
   * router.
   */
  base?: string
  /**
   * Dev-time middleware mode. When set, the host app owns the SPA and
   * devframe spins up a separate RPC + WS server on a resolved port,
   * registering Vite middleware at `<base>__connection.json` so the
   * host-served SPA can discover the WS endpoint.
   *
   *  - `false` (default) — static-mount the SPA at `base` with SPA
   *    fallback. No RPC server is started.
   *  - `true` — bridge mode with all defaults (port from
   *    {@link resolveDevServerPort}, host from `def.cli?.host`).
   *  - object — bridge mode with explicit overrides.
   */
  devMiddleware?: boolean | {
    /** Override the bridge port. Default: {@link resolveDevServerPort}. */
    port?: number
    /** Override the bridge bind host. Default: `def.cli?.host ?? 'localhost'`. */
    host?: string
    /** Flag bag forwarded to `def.setup(ctx, { flags })`. */
    flags?: Record<string, unknown>
  }
}

export interface DevframeVitePlugin {
  name: string
  apply: 'serve'
  configureServer: (server: {
    middlewares: { use: (path: string, handler: any) => void }
    httpServer?: { once: (event: 'close', cb: () => void) => void } | null
  }) => void | Promise<void>
  closeBundle?: () => void | Promise<void>
}

/**
 * Vite plugin for hosting a devframe inside a Vite dev server.
 *
 * Two modes, picked via `options.devMiddleware`:
 *
 *   - **static-mount mode** (default) — mounts `def.cli.distDir` at
 *     `options.base` with SPA fallback enabled. No RPC server is started.
 *
 *   - **bridge mode** (`devMiddleware: true | {…}`) — skips the static
 *     mount; the host app owns the SPA. Devframe starts a separate
 *     RPC + WS dev server (via {@link createDevServer} in bridge mode)
 *     and registers Vite middleware at `<base>__connection.json` so the
 *     host-served SPA can discover the WS endpoint via
 *     {@link connectDevframe}.
 *
 * Use bridge mode when integrating with frameworks that own the SPA
 * (Nuxt, Astro, SolidStart, plain Vite apps). For the all-in-one
 * `dev` / `build` / `mcp` shell, reach for {@link createCli} instead.
 */
export function createVitePlugin(d: DevframeDefinition, options: CreateVitePluginOptions = {}): DevframeVitePlugin {
  const base = normalizeMountBase(options.base ?? resolveBasePath(d, 'hosted'))

  if (!options.devMiddleware) {
    const distDir = d.cli?.distDir
    return {
      name: `devframe:${d.id}`,
      apply: 'serve',
      configureServer(server) {
        if (!distDir)
          return
        server.middlewares.use(base, serveStaticNodeMiddleware(resolve(distDir)))
      },
    }
  }

  const mw = options.devMiddleware === true ? {} : options.devMiddleware
  let started: Awaited<ReturnType<typeof createDevServer>> | undefined

  return {
    name: `devframe:${d.id}`,
    apply: 'serve',
    async configureServer(server) {
      // Vite re-invokes `configureServer` on each restart cycle; close
      // the prior handle so we don't leak the WS server. Silent catch —
      // a stale handle's close failure shouldn't block a fresh start.
      await started?.close().catch(() => {})
      started = undefined

      let port: number
      try {
        port = mw.port ?? await resolveDevServerPort(d, { host: mw.host })
        started = await createDevServer(d, {
          host: mw.host,
          port,
          flags: mw.flags,
          openBrowser: false,
        })
      }
      catch (e) {
        logger.DF0033({ id: d.id, reason: String(e) }, { cause: e as Error }).log()
        return
      }

      const metaPath = `${base}${DEVTOOLS_CONNECTION_META_FILENAME}`
      server.middlewares.use(metaPath, (_req: unknown, res: any) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ backend: 'websocket', websocket: port }))
      })

      server.httpServer?.once('close', () => {
        void started?.close().catch(() => {})
      })
    },

    async closeBundle() {
      await started?.close().catch(() => {})
      started = undefined
    },
  }
}

/**
 * Make `base` safe for `server.middlewares.use(path, …)`. Vite's connect
 * router matches by absolute URL prefix, so relative spellings like
 * `'./'` (commonly used for base-agnostic Nuxt builds) need to be
 * converted to `/` first.
 */
function normalizeMountBase(base: string): string {
  let out = base.replace(/^\.\/?/, '/')
  if (!out.startsWith('/'))
    out = `/${out}`
  if (!out.endsWith('/'))
    out = `${out}/`
  return out.replace(/\/+/g, '/')
}
