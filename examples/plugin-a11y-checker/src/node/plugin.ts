import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { normalizePath } from 'vite'

function resolveClientScript(): string {
  const distFromBundle = fileURLToPath(new URL('./client/run-axe.js', import.meta.url))
  const distFromSource = fileURLToPath(new URL('../../dist/client/run-axe.js', import.meta.url))
  return fs.existsSync(distFromBundle) ? distFromBundle : distFromSource
}

export function createA11yCheckerPlugin(): PluginWithDevTools {
  return {
    name: 'plugin-a11y-checker-devtools',
    devtools: {
      setup(context) {
        const clientScript = resolveClientScript()

        context.docks.register({
          type: 'action',
          id: 'a11y-checker',
          title: 'Run A11y Check',
          icon: 'ph:wheelchair-duotone',
          category: 'tools',
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

export default createA11yCheckerPlugin
