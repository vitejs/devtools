import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { normalizePath } from 'vite'

export function createA11yCheckerPlugin(): PluginWithDevTools {
  return {
    name: 'plugin-a11y-checker-devtools',
    devtools: {
      setup(context) {
        context.logs.add({
          message: 'A11y Checker enabled — will run audit automatically',
          level: 'info',
          notify: true,
          autoDismiss: 3000,
          autoDelete: 10000,
          category: 'a11y',
        })
      },
    },
    transformIndexHtml() {
      const distFromBundle = fileURLToPath(new URL('./client/run-axe.js', import.meta.url))
      const distFromSource = fileURLToPath(new URL('../../dist/client/run-axe.js', import.meta.url))
      const clientScript = fs.existsSync(distFromBundle) ? distFromBundle : distFromSource

      return [
        {
          tag: 'script',
          attrs: {
            src: `/@fs/${normalizePath(clientScript)}`,
            type: 'module',
          },
          injectTo: 'body',
        },
      ]
    },
  }
}

export default createA11yCheckerPlugin
