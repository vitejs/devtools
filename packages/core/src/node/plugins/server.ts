import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { Plugin } from 'vite'
import { createDevToolsContext } from '../context'
import { createDevToolsMiddleware } from '../server'
import '../rpc'

/**
 * Core plugin for enabling Vite DevTools
 */
export function DevToolsServer(): Plugin {
  let context: DevToolsNodeContext
  return {
    name: 'vite:devtools:server',
    enforce: 'post',
    apply: 'serve',
    async configureServer(viteDevServer) {
      context = await createDevToolsContext(viteDevServer.config, viteDevServer)
      const { middleware } = await createDevToolsMiddleware({
        cwd: viteDevServer.config.root,
        context,
      })
      viteDevServer.middlewares.use('/.devtools/', middleware)
    },
    resolveId(id) {
      if (id === '/.devtools-imports') {
        return id
      }
    },
    load(id) {
      if (id === '/.devtools-imports') {
        if (!context) {
          throw new Error('DevTools context is not initialized')
        }
        const docks = Array.from(context.docks.values())
        const imports = docks.map(i => i.import ? { id: i.id, ...i.import } : undefined).filter(x => !!x)
        return [
          `export const importsMap = {`,
          ...imports.map(i => `  ${JSON.stringify(i.id)}: () => import(${JSON.stringify(i.importFrom)}).then(r => r[${JSON.stringify(i.importName)}]),`),
          '}',
        ].join('\n')
      }
    },
  }
}
