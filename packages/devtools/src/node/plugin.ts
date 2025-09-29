import type { Plugin } from 'vite'
import { join } from 'node:path'
import process from 'node:process'
import { normalizePath } from 'vite'
import { distDir } from '../dirs'
import { createDevToolsContext } from './context'
import { createDevToolsMiddleware } from './server'
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
      const { middleware } = await createDevToolsMiddleware({
        cwd: vite.config.root,
        context,
      })
      vite.middlewares.use('/__vite_devtools__', middleware)
    },
    transformIndexHtml() {
      const fileUrl = process.env.VITE_DEVTOOLS_LOCAL_DEV
        ? normalizePath(join(distDir, '..', 'src', 'client-inject', 'index.ts'))
        : normalizePath(join(distDir, 'client-inject.js'))
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
