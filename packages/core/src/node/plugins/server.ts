import type { ClientScriptEntry, DevToolsNodeContext } from '@vitejs/devtools-kit'
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
        const map = new Map<string, ClientScriptEntry>()
        for (const dock of docks) {
          const id = `${dock.type}:${dock.id}`
          if (dock.type === 'action') {
            // TODO: backward compatibility, remove later
            // @ts-expect-error ignore
            map.set(id, dock.action || dock.import)
          }
          else if (dock.type === 'custom-render') {
            map.set(id, dock.renderer)
          }
          else if (dock.type === 'iframe' && dock.clientScript) {
            map.set(id, dock.clientScript)
          }
          else if ('import' in dock) {
            // TODO: backward compatibility, remove later
            // @ts-expect-error ignore
            map.set(id, dock.import)
          }
        }
        return [
          `export const importsMap = {`,
          ...[...map.entries()]
            .filter(([, entry]) => entry != null)
            .map(([id, { importFrom, importName }]) => `  [${JSON.stringify(id)}]: () => import(${JSON.stringify(importFrom)}).then(r => r[${JSON.stringify(importName)}]),`),
          '}',
        ].join('\n')
      }
    },
  }
}
