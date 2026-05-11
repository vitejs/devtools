import type { App } from 'h3'
import type { StartedServer } from '../node/server'
import type { DevframeDefinition, DevframeSetupInfo } from '../types/devframe'
import process from 'node:process'
import { getPort } from 'get-port-please'
import { createApp, eventHandler } from 'h3'
import { resolve } from 'pathe'
import { DEVTOOLS_CONNECTION_META_FILENAME } from '../constants'
import { createHostContext } from '../node/context'
import { createH3DevToolsHost } from '../node/host-h3'
import { startHttpAndWs } from '../node/server'
import { open } from '../utils/open'
import { serveStaticHandler } from '../utils/serve-static'
import { normalizeBasePath, resolveBasePath } from './_shared'

const DEFAULT_PORT = 9999

export interface CreateDevServerOptions {
  /** Bind host. Default: `def.cli?.host ?? 'localhost'`. */
  host?: string
  /**
   * Port to listen on. When omitted, falls back to
   * {@link resolveDevServerPort}, which respects `def.cli?.port` /
   * `portRange` / `random`.
   */
  port?: number
  /**
   * Parsed flag bag forwarded to `setup(ctx, { flags })`. The dev
   * server itself only reads `flags.open` from this bag, and only when
   * {@link CreateDevServerOptions.openBrowser} is left undefined.
   */
  flags?: Record<string, unknown>
  /**
   * Override `def.cli?.distDir`. When neither this option nor
   * `def.cli?.distDir` is set, the dev server runs in **bridge mode** —
   * only `__connection.json` and the WS endpoint are mounted; the SPA
   * is expected to be hosted elsewhere (e.g. by a parent Vite/Nuxt
   * dev server via `createVitePlugin({ devMiddleware })`).
   */
  distDir?: string
  /**
   * Override the SPA mount path. Defaults to
   * `resolveBasePath(def, 'standalone')` (i.e. `def.basePath` or `/`).
   */
  basePath?: string
  /**
   * h3 app to mount the SPA + connection-meta routes on. When omitted
   * a fresh app is created. Pass a pre-configured app to attach custom
   * middleware (auth, logging, extra static assets) before devframe's
   * own handlers.
   */
  app?: App
  /**
   * Auto-open the browser. When `undefined` the resolution falls
   * through to `flags.open` (incl. string path) and finally
   * `def.cli?.open`. `false` disables the open regardless of the other
   * sources; a string opens that relative path.
   */
  openBrowser?: boolean | string
  /**
   * Called once the WS server is bound. Devframe stays headless
   * otherwise — wire this if you want a startup banner.
   */
  onReady?: (info: { origin: string, port: number, app: App }) => void | Promise<void>
}

export interface ResolveDevServerPortOptions {
  /** Bind host (passed to `get-port-please` for in-use detection). */
  host?: string
  /** Override the preferred port. Default: `def.cli?.port ?? 9999`. */
  defaultPort?: number
}

/**
 * Resolve the listening port for {@link createDevServer}, honoring the
 * definition's `cli.port` / `cli.portRange` / `cli.random` settings.
 * Exposed separately so authors who run their own argv parsing can
 * resolve a port up-front (to print it, log it, etc.) before starting
 * the server.
 */
export async function resolveDevServerPort(
  def: DevframeDefinition,
  options: ResolveDevServerPortOptions = {},
): Promise<number> {
  const host = options.host ?? def.cli?.host ?? 'localhost'
  const port = options.defaultPort ?? def.cli?.port ?? DEFAULT_PORT
  // Only include optional fields when set — `get-port-please` spreads
  // user options over its defaults, so `portRange: undefined` would
  // wipe out the internal `[]` and crash on iteration.
  const portOptions: Parameters<typeof getPort>[0] = { port, host }
  if (def.cli?.portRange)
    portOptions.portRange = def.cli.portRange
  if (def.cli?.random)
    portOptions.random = def.cli.random
  return getPort(portOptions)
}

/**
 * Start a devframe dev server for a {@link DevframeDefinition} —
 * h3 + WebSocket RPC + (optionally) the author's SPA mounted at the
 * resolved base path.
 *
 * When `distDir` is omitted (and `def.cli?.distDir` is unset) the
 * server runs in **bridge mode**: only `__connection.json` and the WS
 * endpoint are mounted, with no SPA mount. The SPA is expected to be
 * hosted elsewhere (e.g. by a parent Vite/Nuxt dev server) — see
 * `createVitePlugin({ devMiddleware })`.
 *
 * Returns the underlying {@link StartedServer} handle so callers can
 * close it gracefully (SIGINT, hot-reload, test teardown).
 *
 * Use this directly when integrating devframe into an existing CLI
 * framework (commander, yargs, hand-rolled CAC). For the all-in-one
 * `dev` / `build` / `mcp` shell, reach for {@link createCli} instead.
 */
export async function createDevServer(
  def: DevframeDefinition,
  options: CreateDevServerOptions = {},
): Promise<StartedServer> {
  const distDir = options.distDir ?? def.cli?.distDir

  const host = options.host ?? def.cli?.host ?? 'localhost'
  const port = options.port ?? await resolveDevServerPort(def, { host })
  const flags = options.flags ?? {}
  const basePath = options.basePath ? normalizeBasePath(options.basePath) : resolveBasePath(def, 'standalone')
  const app = options.app ?? createApp()
  const origin = `http://${host}:${port}`

  const h3Host = createH3DevToolsHost({
    origin,
    appName: def.id,
    mount: (base, dir) => {
      app.use(base, serveStaticHandler(dir))
    },
  })

  const ctx = await createHostContext({
    cwd: process.cwd(),
    mode: 'dev',
    host: h3Host,
  })
  const setupInfo: DevframeSetupInfo = { flags }
  await def.setup(ctx, setupInfo)

  // Connection meta — the SPA fetches this to discover the RPC backend.
  // In dev the WS endpoint shares the HTTP port, so the client only needs
  // to know it's a websocket backend bound to that same port. The path
  // sits at the SPA root (next to index.html) so the deployed SPA can
  // discover it via a relative `./__connection.json` fetch.
  const connectionMetaPath = `${basePath}${DEVTOOLS_CONNECTION_META_FILENAME}`
  app.use(connectionMetaPath, eventHandler((event) => {
    event.node.res.setHeader('Content-Type', 'application/json')
    return event.node.res.end(JSON.stringify({ backend: 'websocket', websocket: port }))
  }))

  if (distDir)
    app.use(basePath, serveStaticHandler(resolve(distDir)))

  return startHttpAndWs({
    context: ctx,
    host,
    port,
    app,
    auth: def.cli?.auth,
    onReady: async (info) => {
      await options.onReady?.(info)
      await maybeOpenBrowser(def, flags, `${info.origin}${basePath}`, options.openBrowser)
    },
  })
}

async function maybeOpenBrowser(
  def: DevframeDefinition,
  flags: Record<string, unknown>,
  origin: string,
  override: boolean | string | undefined,
): Promise<void> {
  const flagsOpen = flags.open as boolean | string | undefined
  const cliOpen = def.cli?.open
  // Explicit override wins; otherwise CLI flag (`--open` / `--no-open`
  // / `--open path`); finally the definition default.
  const resolved = override ?? flagsOpen ?? cliOpen
  if (resolved === undefined || resolved === false)
    return
  const target = typeof resolved === 'string'
    ? resolveOpenTarget(origin, resolved)
    : origin
  try {
    await open(target)
  }
  catch {
    // Failing to launch a browser shouldn't break the dev server.
    // The user can navigate manually.
  }
}

function resolveOpenTarget(origin: string, target: string): string {
  if (/^https?:/.test(target))
    return target
  if (target.startsWith('/'))
    return origin.replace(/\/$/, '') + target
  return origin.replace(/\/$/, '') + (target ? `/${target}` : '')
}
