import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import process from 'node:process'
import { DEVTOOLS_VITEPLUS_GROUP_ID } from '@vitejs/devtools-kit/constants'
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
 * installs `@vitest/ui` on demand (as a devDependency), spawns
 * `vitest --ui` on a free port, waits for the server, then swaps the dock
 * entry to an iframe embedding Vitest's own UI.
 */
export function DevToolsVitestUI(): PluginWithDevTools {
  return {
    name: 'vite:devtools:vitest-ui',
    devtools: {
      setup(ctx) {
        const cwd = ctx.cwd ?? process.cwd()

        // Hide the dock entirely when the project has no Vitest.
        if (!isPackageExists('vitest', { paths: [cwd] }))
          return

        ctx.views.hostStatic(VITEST_DEVTOOLS_BASE, clientPublicDir)

        const icon = `${VITEST_DEVTOOLS_BASE}favicon.svg`
        const hasUi = isPackageExists('@vitest/ui', { paths: [cwd] })

        // Remembered once the UI server is up, so a second launch reuses it.
        let uiUrl: string | undefined
        // The spawned child-process session (carries `terminate()`); the
        // sessions map only exposes the base session shape.
        let uiSession: Awaited<ReturnType<typeof ctx.terminals.startChildProcess>> | undefined

        ctx.docks.register({
          id: DOCK_ID,
          title: 'Vitest',
          groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
          icon,
          type: 'launcher',
          launcher: {
            title: 'Vitest UI',
            description: hasUi
              ? 'Start the Vitest UI and view it inside DevTools.'
              : 'Install `@vitest/ui` (as a devDependency) and view it inside DevTools.',
            icon,
            buttonStart: hasUi ? 'Start Vitest UI' : 'Install @vitest/ui & start',
            buttonLoading: 'Starting Vitest UI…',
            status: 'idle',
            onLaunch: () => launch(),
          },
        })

        async function launch(): Promise<void> {
          // Idempotent: reuse a still-running server instead of re-spawning.
          // The sessions map reflects live status; `uiSession` holds the
          // child-process handle we terminate before a fresh spawn.
          const existing = ctx.terminals.sessions.get(SESSION_ID)
          if (existing?.status === 'running' && uiUrl) {
            swapToIframe(uiUrl)
            return
          }

          // Install `@vitest/ui` on demand (devDependency) when missing.
          if (!isPackageExists('@vitest/ui', { paths: [cwd] })) {
            try {
              await addDependency('@vitest/ui', { cwd, dev: true })
            }
            catch (error) {
              throw diagnostics.VTDT0001({ error: error instanceof Error ? error.message : String(error) })
            }
          }

          const port = await getPort({ port: PREFERRED_PORT, portRange: [PREFERRED_PORT, PREFERRED_PORT + 500] })
          const url = `http://localhost:${port}/${VITEST_UI_PATH}`

          // A dead session may linger — terminate it before re-spawning.
          if (uiSession)
            await uiSession.terminate().catch(() => {})

          uiSession = await ctx.terminals.startChildProcess(
            {
              command: 'vitest',
              // `--ui` runs in watch mode (needed for a persistent server);
              // `--no-open` keeps Vitest from opening a separate browser tab
              // since we embed it in the DevTools iframe instead.
              args: ['--ui', '--no-open', '--api.port', String(port)],
              cwd,
            },
            {
              id: SESSION_ID,
              title: 'Vitest UI',
              // The Terminals panel maps session icons to a UnoCSS icon class
              // (`toIconClass`) and can only render icons its SPA statically
              // built. A served URL (like the dock favicon) or an unlisted
              // icon renders blank, so use a terminal icon the SPA ships.
              icon: 'ph:terminal-window-duotone',
            },
          )

          if (!(await waitForServer(url, READY_TIMEOUT)))
            throw diagnostics.VTDT0002({ url, timeout: READY_TIMEOUT })

          uiUrl = url
          swapToIframe(url)
        }

        function swapToIframe(url: string): void {
          ctx.docks.update({
            id: DOCK_ID,
            title: 'Vitest',
            groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
            icon,
            type: 'iframe',
            url,
          })
        }
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
