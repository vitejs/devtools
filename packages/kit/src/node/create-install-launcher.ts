import type { DevframeDockEntryIcon } from '@devframes/hub/types'
import type { PluginWithDevTools } from '../types/vite-augment'
import type { ViteDevToolsNodeContext } from '../types/vite-plugin'
import process from 'node:process'
import { isPackageExists } from 'local-pkg'
import { addDependency } from 'nypm'
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
 * clicking it installs the missing package(s) on demand via `nypm`, then swaps
 * the dock to a "restart to activate" message. Because the integration's own
 * Vite plugin has to be present at config-resolution time to mount, activation
 * happens on the next dev-server restart (or `vite-devtools` re-run), when the
 * host re-detects the now-installed package and mounts the real dock.
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
    dev = true,
  } = options

  return {
    name: name ?? `vite:devtools:install-launcher:${id}`,
    devtools: {
      setup(ctx: ViteDevToolsNodeContext) {
        const cwd = ctx.cwd ?? process.cwd()

        ctx.docks.register({
          id,
          title,
          groupId,
          icon,
          type: 'launcher',
          launcher: {
            icon,
            title: label,
            description: `Install ${label} to view it inside DevTools.`,
            buttonStart: `Install ${label}`,
            buttonLoading: 'Installing…',
            status: 'idle',
            onLaunch: launch,
          },
        })

        async function launch(): Promise<void> {
          const missing = install.filter(spec => !isPackageExists(specToName(spec), { paths: [cwd] }))
          if (missing.length) {
            try {
              await addDependency(missing, { cwd, dev })
            }
            catch (error) {
              throw diagnostics.DTK0050({
                packages: missing.join(', '),
                cause: error instanceof Error ? error : new Error(String(error)),
              })
            }
          }

          // The integration's Vite plugin only mounts when it is present at
          // config-resolution time, so activation needs a fresh resolution.
          const restartHint = ctx.viteServer
            ? 'Restart your dev server to activate it.'
            : 'Re-run `vite-devtools` to activate it.'

          ctx.docks.update({
            id,
            title,
            groupId,
            icon,
            type: 'launcher',
            launcher: {
              icon,
              title: label,
              status: 'success',
              description: `${label} installed. ${restartHint}`,
              buttonStart: 'Installed',
              // Re-click is idempotent: the packages are present now, so
              // `launch` installs nothing and just re-affirms the message.
              onLaunch: launch,
            },
          })
        }
      },
    },
  }
}
