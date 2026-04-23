import type { DevToolsHost } from 'devframe/types'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import sirv from 'sirv'

export interface CreateViteDevToolsHostOptions {
  viteConfig: ResolvedConfig
  viteServer?: ViteDevServer
}

export function createViteDevToolsHost(options: CreateViteDevToolsHostOptions): DevToolsHost {
  const { viteConfig, viteServer } = options

  return {
    mountStatic(base, distDir) {
      // In build mode there is no dev server to mount middleware on;
      // static files are baked into the build output by buildStatic.
      if (viteConfig.command !== 'serve')
        return
      if (!viteServer)
        throw new Error('viteServer is required to mount static assets in dev mode')
      viteServer.middlewares.use(base, sirv(distDir, { dev: true, single: true }))
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
  }
}
