import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { normalizePath } from 'vite'

function resolveClientScript(): string | undefined {
  const paths = [
    fileURLToPath(new URL('./client/run-axe.js', import.meta.url)),
    fileURLToPath(new URL('../../dist/client/run-axe.js', import.meta.url)),
    fileURLToPath(new URL('../client/run-axe.ts', import.meta.url)),
  ]
  return paths.find(path => fs.existsSync(path))
}

export function A11yCheckerPlugin(): PluginWithDevTools {
  return {
    name: 'plugin-a11y-checker-devtools',
    devtools: {
      setup(context) {
        const clientScript = resolveClientScript()
        if (!clientScript) {
          throw new Error('[plugin-a11y-checker] Client script not found, did you build the plugin?')
        }

        context.docks.register({
          type: 'action',
          id: 'a11y-checker',
          title: 'Run A11y Check',
          icon: 'ph:wheelchair-duotone',
          category: 'web',
          action: {
            importFrom: `/@fs/${normalizePath(clientScript)}`,
          },
        })

        context.logs.add({
          message: 'A11y Checker ready — click the icon to run an audit',
          level: 'info',
          notify: true,
          autoDismiss: 3000,
          autoDelete: 10000,
          category: 'a11y',
        })
      },
    },
  }
}
