import type { ClientScriptEntry, DevToolsDockEntry, DockRendererRegistration, ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { Server as NodeHttpServer } from 'node:http'
import type { Plugin } from 'vite'
import type { ViteDevToolsUiOptions } from '../ui'
import {
  DEVTOOLS_DOCK_IMPORTS_VIRTUAL_ID,
  DEVTOOLS_MOUNT_PATH,
  DEVTOOLS_MOUNT_PATH_NO_TRAILING_SLASH,
} from '@vitejs/devtools-kit/constants'
import { createDevToolsContext } from '../context'
import { createDevToolsHub } from '../server'
import '../rpc'

/**
 * Core plugin for enabling Vite DevTools
 */
export function renderDockImportsMap(docks: Iterable<DevToolsDockEntry>): string {
  const map = new Map<string, ClientScriptEntry>()
  for (const dock of docks) {
    const id = `${dock.type}:${dock.id}`
    if (dock.type === 'action') {
      map.set(id, dock.action)
    }
    else if (dock.type === 'custom-render') {
      map.set(id, dock.renderer)
    }
    else if (dock.type === 'iframe' && dock.clientScript) {
      map.set(id, dock.clientScript)
    }
  }
  return [
    `export const importsMap = {`,
    ...[...map.entries()]
      .filter(([, entry]) => entry != null)
      .map(([id, { importFrom, importName }]) => `  [${JSON.stringify(id)}]: () => import(${JSON.stringify(importFrom)}).then(r => r[${JSON.stringify(importName ?? 'default')}]),`),
    '}',
  ].join('\n')
}

export function DevToolsServer(
  options: ViteDevToolsUiOptions = {},
  renderers?: readonly DockRendererRegistration[],
): Plugin {
  let context: ViteDevToolsNodeContext
  let close: (() => Promise<void>) | undefined
  return {
    name: 'vite:devtools:server',
    enforce: 'post',
    apply: 'serve',
    async configureServer(viteDevServer) {
      context = await createDevToolsContext(viteDevServer.config, viteDevServer)

      const host = viteDevServer.config.server.host === true
        ? '0.0.0.0'
        : viteDevServer.config.server.host || 'localhost'

      const devtools = await createDevToolsHub({
        context,
        ui: options,
        renderers,
        // Share Vite's HTTP server for a route-bound WS upgrade; fall back to a
        // side-car when Vite runs in middleware mode without its own server.
        // Vite types `httpServer` as a broader union (incl. http2); at dev
        // runtime it is a node http/https server crossws can hook `upgrade` on.
        server: (viteDevServer.httpServer ?? undefined) as NodeHttpServer | undefined,
        host,
      })
      close = devtools.close
      viteDevServer.middlewares.use((req, res, next) => {
        if (req.url === DEVTOOLS_MOUNT_PATH_NO_TRAILING_SLASH || req.url?.startsWith(`${DEVTOOLS_MOUNT_PATH_NO_TRAILING_SLASH}?`)) {
          res.statusCode = 302
          res.setHeader('Location', `${DEVTOOLS_MOUNT_PATH}${req.url.slice(DEVTOOLS_MOUNT_PATH_NO_TRAILING_SLASH.length)}`)
          res.end()
          return
        }

        next()
      })
      // The hub middleware answers the whole `/__devtools/` surface and
      // `next()`s outside its base, so mount it at the server root.
      viteDevServer.middlewares.use(devtools.middleware)
    },
    async closeBundle() {
      await close?.()
    },
    resolveId(id) {
      if (id === DEVTOOLS_DOCK_IMPORTS_VIRTUAL_ID) {
        return id
      }
    },
    load(id) {
      if (id === DEVTOOLS_DOCK_IMPORTS_VIRTUAL_ID) {
        if (!context) {
          throw new Error('DevTools context is not initialized')
        }
        return renderDockImportsMap(context.docks.values())
      }
    },
  }
}
