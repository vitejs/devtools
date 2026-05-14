import type { DevToolsHost } from 'devframe/types'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { serveStaticNodeMiddleware } from 'devframe/utils/serve-static'

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

export function createViteDevToolsHost(options: CreateViteDevToolsHostOptions): DevToolsHost {
  const { viteConfig, viteServer } = options
  const workspaceRoot = options.workspaceRoot ?? viteConfig.root

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
