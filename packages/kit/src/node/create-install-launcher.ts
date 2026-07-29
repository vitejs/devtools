import type { DevframeDockEntryIcon } from '@devframes/hub/types'
import type { DevToolsViewLauncher } from '../types/docks'
import type { DevToolsChildProcessTerminalSession } from '../types/terminals'
import type { PluginWithDevTools } from '../types/vite-augment'
import type { ViteDevToolsNodeContext } from '../types/vite-plugin'
import process from 'node:process'
import { isPackageExists } from 'local-pkg'
import { addDependencyCommand, detectPackageManager } from 'nypm'
import { diagnostics } from './diagnostics'

export interface InstallLauncherOptions {
  /**
   * Dock entry id. Usually the same id the real integration registers once
   * installed, so the launcher and the mounted dock share the same rail slot.
   */
  id: string
  /** Dock title (rail tooltip / group member label). */
  title: string
  /** Dock + launcher icon — a served URL or an Iconify `collection:name`. */
  icon: DevframeDockEntryIcon
  /** Dock group id, e.g. `DEVTOOLS_VITEPLUS_GROUP_ID`. */
  groupId?: string
  /**
   * Friendly label for the thing being installed, used in the launcher copy.
   * Defaults to {@link InstallLauncherOptions.title}.
   */
  label?: string
  /** Vite plugin name. Defaults to `vite:devtools:install-launcher:${id}`. */
  name?: string
  /**
   * The canonical package this launcher installs, named in the button copy
   * (e.g. `Install @vitejs/devtools-oxc`) — concrete and greppable, unlike the
   * friendly {@link InstallLauncherOptions.label}. Defaults to the bare name
   * of the first {@link InstallLauncherOptions.install} spec.
   */
  pkg?: string
  /**
   * npm specs to ensure are installed when the launcher is clicked, e.g.
   * `['@vitejs/devtools-rolldown@^0.4.1']`. Only the specs whose package is
   * not already present get installed, in a single install call.
   */
  install: string[]
  /**
   * Install the packages as devDependencies.
   *
   * @default true
   */
  dev?: boolean
}

/** Extract the bare package name from an npm spec (`name`, `name@range`, `@scope/name@range`). */
function specToName(spec: string): string {
  const at = spec.lastIndexOf('@')
  return at > 0 ? spec.slice(0, at) : spec
}

/**
 * Build a Vite plugin that surfaces a **discovery / install launcher** dock for
 * an optional integration that is not installed yet.
 *
 * The launcher renders in the dock rail (making the integration discoverable);
 * clicking it runs the install as a tracked terminal session — the card streams
 * its progress and offers a "View in Terminal" link (the same primitives
 * `createProcessLauncher` uses for e.g. the Vitest UI launcher) — then swaps to
 * a "restart to activate" message. Because the integration's own Vite plugin
 * has to be present at config-resolution time to mount, activation happens on
 * the next dev-server restart (or `vite-devtools` re-run), when the host
 * re-detects the now-installed package and mounts the real dock.
 */
export function createInstallLauncher(options: InstallLauncherOptions): PluginWithDevTools {
  const {
    id,
    title,
    icon,
    groupId,
    label = title,
    name,
    install,
    pkg = specToName(install[0] ?? title),
    dev = true,
  } = options

  const sessionId = `${id}:install`

  return {
    name: name ?? `vite:devtools:install-launcher:${id}`,
    devtools: {
      setup(ctx: ViteDevToolsNodeContext) {
        // Install at the workspace root, not the (possibly nested) project
        // `cwd` — these are devtools for the whole workspace, and a monorepo's
        // package manager expects devDependencies declared on the root
        // `package.json`, not scattered across whichever sub-package happened
        // to be running Vite.
        const installRoot = ctx.workspaceRoot ?? ctx.cwd ?? process.cwd()
        // The terminal session tracking the most recent install run, if any —
        // kept so a retry can terminate/drop it before spawning a fresh one.
        let session: DevToolsChildProcessTerminalSession | undefined
        // Bind the install action to a command so it fires from the launch
        // button, the command palette, and any keybinding — one handler.
        const commandId = `vite:devtools:install:${id}`

        // Re-render the whole launcher entry — the hub sync replaces it
        // wholesale — reflecting the current status and, once an install is
        // running or has run, the tracked terminal session + a short digest.
        function entry(
          status: DevToolsViewLauncher['launcher']['status'],
          extras: { description?: string, buttonStart?: string, tracking?: boolean, progress?: string, error?: string } = {},
        ): DevToolsViewLauncher {
          return {
            id,
            title,
            groupId,
            icon,
            type: 'launcher',
            launcher: {
              icon,
              title: label,
              description: extras.description ?? `Install ${label} to view it inside DevTools.`,
              buttonStart: extras.buttonStart ?? `Install ${pkg}`,
              buttonLoading: 'Installing…',
              status,
              error: extras.error,
              // The bound command is the launch action; the on-launch bridge
              // falls back to it, so no in-process `onLaunch` is needed.
              command: commandId,
              ...(extras.tracking ? { terminalSessionId: sessionId } : {}),
              // Hub's author-set `digest` — a short line of progress/status.
              ...(extras.progress ? { digest: extras.progress } : {}),
            },
          }
        }

        ctx.commands.register({
          id: commandId,
          title: `Install ${pkg}`,
          icon,
          handler: launch,
        })

        ctx.docks.register<DevToolsViewLauncher>(entry('idle'))

        // Terminate and drop a prior install's session so a retry can reuse
        // the terminal id without colliding with `startChildProcess`.
        async function disposeSession(): Promise<void> {
          if (session)
            await session.terminate().catch(() => {})
          session = undefined
          ctx.terminals.sessions.delete(sessionId)
        }

        async function launch(): Promise<void> {
          const missing = install.filter(spec => !isPackageExists(specToName(spec), { paths: [installRoot] }))

          if (missing.length) {
            try {
              await disposeSession()

              const packageManager = await detectPackageManager(installRoot)
              const commandLine = addDependencyCommand(packageManager?.name ?? 'npm', missing, { dev })
              const [command = packageManager?.command ?? 'npm', ...args] = commandLine.split(' ')

              ctx.docks.update(entry('loading', { tracking: true, progress: 'Installing…' }))

              session = await ctx.terminals.startChildProcess(
                { command, args, cwd: installRoot },
                { id: sessionId, title: `Install ${label}`, icon: 'ph:terminal-window-duotone' },
              )

              const result = await session.getResult()
              if (result.exitCode !== 0) {
                throw new Error(`\`${commandLine}\` exited with code ${result.exitCode ?? 'null'}.`)
              }
            }
            catch (error) {
              const cause = error instanceof Error ? error : new Error(String(error))
              ctx.docks.update(entry('error', { tracking: true, error: cause.message }))
              throw diagnostics.DTK0050({ packages: missing.join(', '), cause })
            }
          }

          // The integration's Vite plugin only mounts when it is present at
          // config-resolution time, so activation needs a fresh resolution.
          const restartHint = ctx.viteServer
            ? 'Restart your dev server to activate it.'
            : 'Re-run `vite-devtools` to activate it.'

          ctx.docks.update(entry('success', {
            // Keep the session link once an install actually ran, so "View in
            // Terminal" stays available; a no-op re-click (nothing missing)
            // has no session to show.
            tracking: Boolean(session),
            progress: session ? 'Installed' : undefined,
            description: `${label} installed. ${restartHint}`,
            // Re-click is idempotent: the packages are present now, so the
            // command installs nothing and just re-affirms the message.
            buttonStart: 'Installed',
          }))
        }
      },
    },
  }
}
