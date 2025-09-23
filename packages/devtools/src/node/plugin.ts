import type { Plugin } from 'vite'
import { join } from 'node:path'
import { normalizePath } from 'vite'
import { distDir } from '../dirs'
import { createDevToolsContext } from './context'
import { createDevtoolsMiddleware } from './server'
import '@vitejs/devtools-kit'

/**
 * Core plugin for enabling Vite DevTools
 */
export function DevTools(): Plugin {
  return {
    name: 'vite:devtools',
    enforce: 'post',
    async configureServer(vite) {
      const context = await createDevToolsContext(vite.config)
      const { middleware } = await createDevtoolsMiddleware({
        cwd: vite.config.root,
        context,
        functions: context.rpc,
      })
      vite.middlewares.use('/__vite_devtools__', middleware)
    },
    transformIndexHtml() {
      const fileUrl = normalizePath(join(distDir, 'client-inject.js'))
      return [
        {
          tag: 'script',
          attrs: {
            src: `/@fs/${fileUrl}`,
            type: 'module',
          },
          injectTo: 'body',
        },
      ]
    },
  }
}
