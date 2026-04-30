import type { DevtoolDefinition } from '../types/devtool'
import { resolve } from 'pathe'
import sirv from 'sirv'
import { resolveBasePath } from './_shared'

export interface CreateVitePluginOptions {
  /**
   * Mount base. Defaults to `def.basePath ?? '/.<id>/'` for this hosted
   * adapter — the devtool shares the origin with the host Vite app.
   */
  base?: string
}

export interface DevframeVitePlugin {
  name: string
  apply: 'serve'
  configureServer: (server: {
    middlewares: { use: (path: string, handler: any) => void }
  }) => void
}

/**
 * Plain Vite plugin — mounts a devframe devtool's SPA into a user's
 * Vite dev server at `options.base` (default: `def.basePath ?? '/.<id>/'`).
 * Use this for tools that want the Vite dev experience without
 * pulling the full Vite DevTools Kit.
 *
 * Note: this does not yet spin up the RPC WS server — for the full
 * RPC path, use `createKitPlugin` alongside `@vitejs/devtools`, or the
 * standalone `createCli`.
 */
export function createVitePlugin(d: DevtoolDefinition, options: CreateVitePluginOptions = {}): DevframeVitePlugin {
  const base = options.base ?? resolveBasePath(d, 'hosted')
  const distDir = d.cli?.distDir
  return {
    name: `devframe:${d.id}`,
    apply: 'serve',
    configureServer(server) {
      if (!distDir)
        return
      server.middlewares.use(base, sirv(resolve(distDir), { dev: true, single: true }))
    },
  }
}
