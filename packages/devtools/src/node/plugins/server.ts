import type { Plugin } from 'vite'
import { createDevToolsContext } from '../context'
import { createDevToolsMiddleware } from '../server'
import '../rpc'

/**
 * Core plugin for enabling Vite DevTools
 */
export function DevToolsServer(): Plugin {
  return {
    name: 'vite:devtools:server',
    enforce: 'post',
    apply: 'serve',
    async configureServer(viteDevServer) {
      const context = await createDevToolsContext(viteDevServer.config, viteDevServer)
      const { middleware } = await createDevToolsMiddleware({
        cwd: viteDevServer.config.root,
        context,
      })
      viteDevServer.middlewares.use('/__vite_devtools__/', middleware)
    },
  }
}
