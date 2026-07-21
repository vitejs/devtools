import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import process from 'node:process'
import { DEVTOOLS_VITEPLUS_GROUP_ID } from '@vitejs/devtools-kit/constants'
import { createProcessLauncher } from '@vitejs/devtools-kit/node'
import { getPort } from 'get-port-please'
import { isPackageExists } from 'local-pkg'
import { addDependency } from 'nypm'
import { clientPublicDir } from '../dirs'
import { diagnostics } from './diagnostics'

const VITEST_DEVTOOLS_BASE = '/__devtools-vitest/'
/** Path Vitest's own UI server serves its app under. */
const VITEST_UI_PATH = '__vitest__/'
/** Fixed terminal-session id so re-launches are idempotent. */
const SESSION_ID = 'vitest:ui'
const DOCK_ID = 'vitest'
const PREFERRED_PORT = 51204
const READY_TIMEOUT = 30_000

/**
 * A slim launcher for the Vitest UI, surfaced in the "Vite+" dock group.
 *
 * The dock only appears when the project depends on `vitest`. Clicking it
 * installs `@vitest/ui` on demand (as a devDependency), spawns `vitest --ui`
 * on a free port, streams the startup output as a digest, then swaps the dock
 * entry to an iframe embedding Vitest's own UI once the server is ready.
 *
 * This is the canonical "run commands, start a server, then embed it" launcher
 * built on the kit's `createProcessLauncher`.
 */
export function DevToolsVitestUI(): PluginWithDevTools {
  return {
    name: 'vite:devtools:vitest-ui',
    devtools: {
      async setup(ctx) {
        const cwd = ctx.cwd ?? process.cwd()

        // Hide the dock entirely when the project has no Vitest.
        if (!isPackageExists('vitest', { paths: [cwd] }))
          return

        ctx.views.hostStatic(VITEST_DEVTOOLS_BASE, clientPublicDir)

        const icon = `${VITEST_DEVTOOLS_BASE}favicon.svg`
        const hasUi = isPackageExists('@vitest/ui', { paths: [cwd] })

        // The chosen URL, shared between the spawn spec and the readiness probe.
        let url: string

        const launcher = createProcessLauncher({
          id: DOCK_ID,
          title: 'Vitest',
          groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
          icon,
          label: 'Vitest UI',
          description: hasUi
            ? 'Start the Vitest UI and view it inside DevTools.'
            : 'Install `@vitest/ui` (as a devDependency) and view it inside DevTools.',
          buttonStart: hasUi ? 'Start Vitest UI' : 'Install @vitest/ui & start',
          buttonLoading: 'Starting Vitest UI…',
          command: { id: 'vite:devtools:vitest:start-ui', title: 'Start Vitest UI', icon },
          session: {
            id: SESSION_ID,
            title: 'Vitest UI',
            // The Terminals panel maps session icons to a UnoCSS icon class
            // (`toIconClass`) and can only render icons its SPA statically
            // built. A served URL (like the dock favicon) or an unlisted icon
            // renders blank, so use a terminal icon the SPA ships.
            icon: 'ph:terminal-window-duotone',
          },
          // Install `@vitest/ui` on demand (devDependency) when missing.
          prepare: async () => {
            if (!isPackageExists('@vitest/ui', { paths: [cwd] })) {
              try {
                await addDependency('@vitest/ui', { cwd, dev: true })
              }
              catch (error) {
                throw diagnostics.VTDT0001({ error: error instanceof Error ? error.message : String(error) })
              }
            }
          },
          process: async () => {
            const port = await getPort({ port: PREFERRED_PORT, portRange: [PREFERRED_PORT, PREFERRED_PORT + 500] })
            url = `http://localhost:${port}/${VITEST_UI_PATH}`
            return {
              command: 'vitest',
              // `--ui` runs in watch mode (needed for a persistent server);
              // `--no-open` keeps Vitest from opening a separate browser tab
              // since we embed it in the DevTools iframe instead.
              args: ['--ui', '--no-open', '--api.port', String(port)],
              cwd,
            }
          },
          serve: {
            onReady: async () => {
              if (!(await waitForServer(url, READY_TIMEOUT)))
                throw diagnostics.VTDT0002({ url, timeout: READY_TIMEOUT })
              return url
            },
          },
        })

        await launcher.devtools!.setup!(ctx)
      },
    },
  }
}

async function waitForServer(url: string, timeout: number): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url)
      if (res.status < 500)
        return true
    }
    catch {
      // server not up yet
    }
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  return false
}
