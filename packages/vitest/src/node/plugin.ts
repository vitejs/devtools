import type { DevToolsChildProcessTerminalSession, DevToolsLaunchRoot, PluginWithDevTools } from '@vitejs/devtools-kit'
import { dirname, relative, resolve } from 'node:path'
import process from 'node:process'
import { createProcessLauncher } from '@vitejs/devtools-kit/node'
import { getPort } from 'devframe/utils/get-port'
import { isPackageExists } from 'local-pkg'
import { resolveCommand } from 'package-manager-detector/commands'
import { detect } from 'package-manager-detector/detect'
import { glob } from 'tinyglobby'
import { clientPublicDir } from '../dirs'
import { diagnostics } from './diagnostics'
import { waitForVitestUi } from './ui-url'

const VITEST_DEVTOOLS_BASE = '/__devtools-vitest/'
/** Path Vitest's own UI server serves its app under. */
const VITEST_UI_PATH = '__vitest__/'
/** Fixed terminal-session id so re-launches are idempotent. */
const SESSION_ID = 'vitest:ui'
/** Terminal-session id for the on-demand `@vitest/ui` install. */
const INSTALL_SESSION_ID = 'vitest:install'
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
        // `@vitest/ui` is installed at the workspace root, not the (possibly
        // nested) project `cwd` — devtools installs are workspace-wide
        // devDependencies, not scattered across whichever sub-package happens
        // to be running Vite.
        const installRoot = ctx.workspaceRoot ?? cwd

        // Hide the dock entirely when the project has no Vitest.
        if (!isPackageExists('vitest', { paths: [cwd] }))
          return

        ctx.views.hostStatic(VITEST_DEVTOOLS_BASE, clientPublicDir)

        const icon = `${VITEST_DEVTOOLS_BASE}favicon.svg`
        const hasUi = isPackageExists('@vitest/ui', { paths: [installRoot] })

        const roots = await discoverRoots(cwd, ctx.workspaceRoot ?? cwd)

        // The chosen URL, shared between the spawn spec and the readiness probe.
        let url: string
        // Tracks the on-demand install run so a retry can drop it before
        // spawning a fresh session under the same id.
        let installSession: DevToolsChildProcessTerminalSession | undefined

        const launcher = createProcessLauncher({
          id: DOCK_ID,
          title: 'Vitest',
          groupId: 'viteplus',
          icon,
          label: 'Vitest UI',
          description: hasUi
            ? 'Start the Vitest UI and view it inside DevTools.'
            : 'Install `@vitest/ui` (as a devDependency) and view it inside DevTools.',
          buttonStart: hasUi ? 'Start Vitest UI' : 'Install @vitest/ui & start',
          buttonLoading: 'Starting Vitest UI…',
          roots,
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
          // Install `@vitest/ui` on demand (devDependency) when missing, at the
          // workspace root, as a tracked terminal session so its progress
          // streams into DevTools.
          prepare: async () => {
            if (!isPackageExists('@vitest/ui', { paths: [installRoot] })) {
              try {
                // Drop a prior (failed) install so the id is free to reuse.
                if (installSession)
                  await installSession.terminate().catch(() => {})
                installSession = undefined
                ctx.terminals.sessions.delete(INSTALL_SESSION_ID)

                const agent = (await detect({ cwd: installRoot }))?.agent ?? 'npm'
                // Every supported agent defines an `add` command, so this always resolves.
                const { command, args } = resolveCommand(agent, 'add', ['-D', '@vitest/ui'])!

                installSession = await ctx.terminals.startChildProcess(
                  { command, args, cwd: installRoot },
                  { id: INSTALL_SESSION_ID, title: 'Install @vitest/ui', icon: 'ph:terminal-window-duotone' },
                )
                const result = await installSession.getResult()
                if (result.exitCode !== 0)
                  throw new Error(`\`${command} ${args.join(' ')}\` exited with code ${result.exitCode ?? 'null'}.`)
              }
              catch (error) {
                throw diagnostics.VTDT0001({ error: error instanceof Error ? error.message : String(error) })
              }
            }
          },
          process: async ({ root }) => {
            const port = await getPort({ port: PREFERRED_PORT, portRange: [PREFERRED_PORT, PREFERRED_PORT + 500] })
            url = `http://localhost:${port}/${VITEST_UI_PATH}`
            return {
              command: 'vitest',
              // `--watch` keeps the server (and its WebSocket API the UI needs)
              // alive after the first run — a spawned child process has no TTY,
              // so Vitest would otherwise default to a single run and exit,
              // leaving the embedded UI unable to connect. `--no-open` keeps
              // Vitest from opening a separate browser tab since we embed it in
              // the DevTools iframe instead.
              args: ['--ui', '--no-open', '--watch', '--api.port', String(port)],
              // Run in the user-selected launch root (falls back to the project
              // root when no picker choice is present).
              cwd: root ?? cwd,
            }
          },
          serve: {
            onReady: async (session) => {
              // Vitest 5 gates its UI behind the API token it prints on
              // startup; embed the tokenized URL so the iframe gets the UI
              // rather than the `403` auth page.
              const ready = await waitForVitestUi(url, READY_TIMEOUT, () => session.buffer?.join('') ?? '')
              if (!ready)
                throw diagnostics.VTDT0002({ url, timeout: READY_TIMEOUT })
              return ready
            },
          },
        })

        await launcher.devtools!.setup!(ctx)
      },
    },
  }
}

/**
 * Build the list of launch roots the user can run Vitest from: every directory
 * holding a Vitest/Vite config in the workspace, with the project and workspace
 * roots relabelled for clarity. The project root is only offered when it
 * actually holds a config — running Vitest from a config-less directory isn't
 * meaningful. Deduped by absolute path, first label wins.
 */
async function discoverRoots(cwd: string, workspaceRoot: string): Promise<DevToolsLaunchRoot[]> {
  const roots = new Map<string, DevToolsLaunchRoot>()
  const add = (path: string, label: string): void => {
    const abs = resolve(path)
    if (!roots.has(abs))
      roots.set(abs, { value: abs, label, description: abs })
  }

  let configDirs: string[] = []
  try {
    const matches = await glob(
      ['**/vitest.config.*', '**/vitest.workspace.*', '**/vite.config.*'],
      {
        cwd: workspaceRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      },
    )
    configDirs = matches.map(file => resolve(dirname(file)))
  }
  catch {
    // A failed scan just means fewer roots to pick from.
  }

  // Only offer the project root when it holds a config of its own.
  if (configDirs.includes(resolve(cwd)))
    add(cwd, 'Project root')
  if (resolve(workspaceRoot) !== resolve(cwd))
    add(workspaceRoot, 'Workspace root')

  for (const dir of [...configDirs].sort((a, b) => a.localeCompare(b))) {
    const rel = relative(workspaceRoot, dir)
    add(dir, rel === '' ? 'Workspace root' : rel)
  }

  return [...roots.values()]
}
