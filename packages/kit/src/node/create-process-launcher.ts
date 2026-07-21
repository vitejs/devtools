import type { DevframeDockEntryIcon } from '@devframes/hub/types'
import type { DevToolsCommandKeybinding } from '../types/commands'
import type { DevToolsViewIframe, DevToolsViewLauncher } from '../types/docks'
import type { DevToolsChildProcessExecuteOptions, DevToolsChildProcessTerminalSession } from '../types/terminals'
import type { PluginWithDevTools } from '../types/vite-augment'
import type { ViteDevToolsNodeContext } from '../types/vite-plugin'
import { diagnostics } from './diagnostics'

type Awaitable<T> = T | Promise<T>

export interface ProcessLauncherOptions {
  /** Dock id. Also the default terminal-session id and command-id base. */
  id: string
  /** Dock rail title. */
  title: string
  /** Dock + launcher icon — a served URL or an Iconify `collection:name`. */
  icon: DevframeDockEntryIcon
  /** Dock group id, e.g. `DEVTOOLS_VITEPLUS_GROUP_ID`. */
  groupId?: string
  /** Launcher card title. Defaults to {@link ProcessLauncherOptions.title}. */
  label?: string
  /** Launcher card description. */
  description?: string
  /** Launch button copy. */
  buttonStart?: string
  buttonLoading?: string
  /**
   * The child process spawned when the launcher is invoked. Pass a function to
   * resolve it lazily on each launch — e.g. to pick a free port and build args.
   */
  process: DevToolsChildProcessExecuteOptions | (() => Awaitable<DevToolsChildProcessExecuteOptions>)
  /**
   * Runs once per launch, before the process is spawned. Use it for on-demand
   * setup such as installing an optional dependency. Throwing here surfaces on
   * the launcher as an error (and rejects the bound command).
   */
  prepare?: () => Awaitable<void>
  /**
   * Turn the launcher into an embedded server view. After the process spawns,
   * `onReady` runs (do your own readiness probing there) and resolves the URL
   * to embed; the dock then swaps from a launcher to an iframe at that URL. The
   * card streams the startup digest while `onReady` is pending. Omit to keep a
   * plain terminal-tailing launcher.
   */
  serve?: {
    onReady: (session: DevToolsChildProcessTerminalSession) => Awaitable<string>
  }
  /**
   * Command binding. The launch action is registered as a command so it fires
   * from the launch button, the palette, and any keybinding. Defaults the
   * command id to `${id}:launch`.
   */
  command?: {
    id?: string
    title?: string
    icon?: DevframeDockEntryIcon
    keybindings?: DevToolsCommandKeybinding[]
  }
  /** Terminal-session metadata. Session id defaults to {@link ProcessLauncherOptions.id}. */
  session?: {
    id?: string
    title?: string
    icon?: DevframeDockEntryIcon
  }
  /** Vite plugin name. Defaults to `vite:devtools:process-launcher:${id}`. */
  name?: string
}

/**
 * Build a launcher dock for a child process — the composed form of the launcher
 * primitives. It registers the launcher, binds a command to the launch action,
 * runs an optional `prepare` step, spawns the process into a terminal session,
 * reflects the process's progress/status on the card, and exposes the session
 * so the card's "View in Terminal" action can jump to its full output.
 *
 * Two shapes, one call:
 *
 * - **Terminal launcher** (no `serve`): the launcher *stays* a launcher while a
 *   long-running process runs (dev servers, watchers, builds), tailing its
 *   output as a digest.
 * - **Server launcher** (`serve.onReady`): run some commands, start a server,
 *   then replace the card with an iframe embedding the server — the digest
 *   streams startup logs until `onReady` resolves the URL, then the dock swaps
 *   to the iframe.
 *
 * ```ts
 * // Terminal launcher
 * createProcessLauncher({
 *   id: 'my-app',
 *   title: 'My App',
 *   icon: 'ph:rocket-launch-duotone',
 *   process: { command: 'vite', args: ['dev'], cwd: process.cwd() },
 * })
 *
 * // Server launcher (spawn → wait → embed)
 * let url: string
 * createProcessLauncher({
 *   id: 'my-ui',
 *   title: 'My UI',
 *   icon: 'ph:browser-duotone',
 *   process: async () => {
 *     const port = await getPort()
 *     url = `http://localhost:${port}/`
 *     return { command: 'my-ui', args: ['--port', String(port)], cwd: process.cwd() }
 *   },
 *   serve: { onReady: async () => { await waitForServer(url); return url } },
 * })
 * ```
 */
export function createProcessLauncher(options: ProcessLauncherOptions): PluginWithDevTools {
  const {
    id,
    title,
    icon,
    groupId,
    label = title,
    description,
    buttonStart,
    buttonLoading,
    process: executeOptions,
    prepare,
    serve,
    name,
  } = options

  const sessionId = options.session?.id ?? id
  const commandId = options.command?.id ?? `${id}:launch`

  return {
    name: name ?? `vite:devtools:process-launcher:${id}`,
    devtools: {
      setup(ctx: ViteDevToolsNodeContext) {
        let session: DevToolsChildProcessTerminalSession | undefined
        // Remembered once a server launcher has swapped to its iframe, so a
        // re-invocation while it is still running re-shows the embed.
        let servedUrl: string | undefined

        // Re-render the whole launcher entry — the hub sync replaces it
        // wholesale — with the current status and (once running) the tracked
        // session + a short progress line.
        function entry(
          status: DevToolsViewLauncher['launcher']['status'],
          extras: { tracking?: boolean, progress?: string, error?: string } = {},
        ): DevToolsViewLauncher {
          return {
            id,
            title,
            groupId,
            icon,
            type: 'launcher',
            launcher: {
              title: label,
              description,
              icon,
              buttonStart,
              buttonLoading,
              status,
              error: extras.error,
              // The bound command is the launch action (button, palette, and
              // keybinding resolve to it); the on-launch bridge falls back to
              // it, so no in-process `onLaunch` is needed.
              command: commandId,
              ...(extras.tracking ? { terminalSessionId: sessionId } : {}),
              // Hub's author-set `digest` — a short line of progress/status.
              ...(extras.progress ? { digest: extras.progress } : {}),
            },
          }
        }

        function swapToIframe(url: string): void {
          const iframe: DevToolsViewIframe = { id, title, groupId, icon, type: 'iframe', url }
          ctx.docks.update(iframe)
        }

        ctx.commands.register({
          id: commandId,
          title: options.command?.title ?? label,
          icon: options.command?.icon ?? icon,
          keybindings: options.command?.keybindings,
          handler: launch,
        })

        ctx.docks.register<DevToolsViewLauncher>(entry('idle'))

        async function launch(): Promise<void> {
          // A live session is left running: re-show the embed for a server
          // launcher, otherwise no-op (don't disturb an in-flight launch).
          if (ctx.terminals.sessions.get(sessionId)?.status === 'running') {
            if (serve && servedUrl)
              swapToIframe(servedUrl)
            return
          }

          try {
            await prepare?.()

            if (session)
              await session.terminate().catch(() => {})

            const execute = typeof executeOptions === 'function' ? await executeOptions() : executeOptions
            session = await ctx.terminals.startChildProcess(execute, {
              id: sessionId,
              title: options.session?.title ?? label,
              icon: options.session?.icon ?? 'ph:terminal-window-duotone',
            })

            if (serve) {
              // Booting: still 'loading', with a status line while we wait.
              ctx.docks.update(entry('loading', { tracking: true, progress: 'Waiting for the server…' }))

              // Wait for the server — but fail fast if the process exits first
              // (e.g. a build error), instead of blocking on a readiness probe
              // that will never succeed.
              const activeSession = session
              const readyPromise = (async () => serve.onReady(activeSession))()
              const exitPromise = (async () => {
                const result = await activeSession.getResult()
                throw diagnostics.DTK0052({ id, exitCode: result.exitCode })
              })()
              // Whichever promise loses the race keeps running (a readiness
              // probe polling on, or a watch process staying up); swallow its
              // late settlement so it never becomes an unhandled rejection.
              readyPromise.catch(() => {})
              exitPromise.catch(() => {})

              const url = await Promise.race([readyPromise, exitPromise])
              servedUrl = url
              swapToIframe(url)
              return
            }

            // Terminal launcher: it's now running. Reflect its outcome once it
            // exits, keeping the session link so its output stays openable.
            // `getResult()` is a bare PromiseLike, so handle rejection inline.
            ctx.docks.update(entry('success', { tracking: true, progress: 'Running' }))
            const trackedSession = session
            void trackedSession.getResult().then(
              (result) => {
                ctx.docks.update(
                  result.exitCode === 0
                    ? entry('success', { tracking: true, progress: 'Finished' })
                    : entry('error', { tracking: true, error: `Process exited with code ${result.exitCode ?? 'null'}.` }),
                )
              },
              () => {},
            )
          }
          catch (error) {
            // Surface the failure on the card (covers palette/keybinding launches
            // too, which don't pass through the on-launch bridge) and re-throw so
            // the button path's bridge reflects it as well. The card stays a
            // launcher, so its button becomes Retry.
            ctx.docks.update(entry('error', { tracking: true, error: error instanceof Error ? error.message : String(error) }))
            throw error
          }
        }
      },
    },
  }
}
