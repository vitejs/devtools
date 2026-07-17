import type { DevframeDockEntryIcon } from '@devframes/hub/types'
import type { DevToolsCommandKeybinding } from '../types/commands'
import type { DevToolsViewLauncher } from '../types/docks'
import type { DevToolsChildProcessExecuteOptions } from '../types/terminals'
import type { PluginWithDevTools } from '../types/vite-augment'
import type { ViteDevToolsNodeContext } from '../types/vite-plugin'
import { tailSessionDigest } from './create-line-digest'

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
  /** The child process spawned when the launcher is invoked. */
  process: DevToolsChildProcessExecuteOptions
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
 * Build a launcher dock for a long-running child process — the composed form
 * of the launcher primitives: it registers the launcher, binds a command to the
 * launch action, spawns the process into a terminal session, streams the
 * session's newest output line onto the card as a digest, and exposes the
 * session so the card's "View in Terminal" action can jump straight to it.
 *
 * Suits integrations whose launcher *stays* a launcher while a process runs
 * (dev servers, watchers, builds). Integrations that ultimately replace the
 * launcher with another view — e.g. swapping to an iframe once a UI server is
 * up — should compose the primitives (`tailSessionDigest`, `ctx.docks.update`,
 * a bound command) directly instead.
 *
 * ```ts
 * DevTools({
 *   plugins: [
 *     createProcessLauncher({
 *       id: 'my-app',
 *       title: 'My App',
 *       icon: 'ph:rocket-launch-duotone',
 *       process: { command: 'vite', args: ['dev'], cwd: process.cwd() },
 *     }),
 *   ],
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
    name,
  } = options

  const sessionId = options.session?.id ?? id
  const commandId = options.command?.id ?? `${id}:launch`

  return {
    name: name ?? `vite:devtools:process-launcher:${id}`,
    devtools: {
      setup(ctx: ViteDevToolsNodeContext) {
        let session: Awaited<ReturnType<typeof ctx.terminals.startChildProcess>> | undefined
        let stopDigest: (() => void) | undefined
        let digest: string | undefined

        // Re-render the whole launcher entry — the hub sync replaces it wholesale
        // — with the current status and (once running) the tracked session +
        // digest.
        function entry(status: DevToolsViewLauncher['launcher']['status'], tracking: boolean): DevToolsViewLauncher {
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
              command: commandId,
              onLaunch: async () => {
                await ctx.commands.execute(commandId)
              },
              ...(tracking ? { terminalSessionId: sessionId, digest } : {}),
            },
          }
        }

        ctx.commands.register({
          id: commandId,
          title: options.command?.title ?? label,
          icon: options.command?.icon ?? icon,
          keybindings: options.command?.keybindings,
          handler: launch,
        })

        ctx.docks.register<DevToolsViewLauncher>(entry('idle', false))

        async function launch(): Promise<void> {
          // Idempotent: a still-running session is left as-is (the card already
          // reflects it); otherwise a stale one is replaced.
          if (ctx.terminals.sessions.get(sessionId)?.status === 'running')
            return

          if (session)
            await session.terminate().catch(() => {})
          stopDigest?.()
          digest = undefined

          session = await ctx.terminals.startChildProcess(executeOptions, {
            id: sessionId,
            title: options.session?.title ?? label,
            icon: options.session?.icon ?? 'ph:terminal-window-duotone',
          })

          stopDigest = tailSessionDigest(session, (line) => {
            digest = line
            ctx.docks.update(entry('success', true))
          })
          ctx.docks.update(entry('success', true))

          // Reflect the process's outcome once it exits and stop tailing, while
          // keeping the session link so the user can still open its output.
          // `getResult()` is a bare PromiseLike, so handle rejection inline.
          void session.getResult().then(
            (result) => {
              stopDigest?.()
              ctx.docks.update(entry(result.exitCode === 0 ? 'success' : 'error', true))
            },
            () => {},
          )
        }
      },
    },
  }
}
