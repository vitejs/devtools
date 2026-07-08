import type { Plugin } from 'vite'
import { createInspectDevframe } from '@devframes/plugin-inspect'
import { createMessagesDevframe } from '@devframes/plugin-messages'
import { createTerminalsDevframe } from '@devframes/plugin-terminals'
import { DEVTOOLS_VITEPLUS_GROUP_ID } from '@vitejs/devtools-kit/constants'
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import { DevToolsBuild } from './build'
import { DevToolsInjection } from './injection'
import { DevToolsServer } from './server'

export interface DevToolsOptions {
  /**
   * Include the Vite builtin devtools UI.
   *
   * @default true
   */
  builtinDevTools?: boolean

  /**
   * Options for building static DevTools output alongside `vite build`.
   */
  build?: {
    /**
     * Automatically build DevTools when running `vite build`.
     *
     * @default false
     */
    withApp?: boolean
    /**
     * Output directory for the DevTools build (relative to root).
     * Defaults to Vite's `build.outDir`.
     */
    outDir?: string
  }
}

export async function DevTools(options: DevToolsOptions = {}): Promise<Plugin[]> {
  const {
    builtinDevTools = true,
    build,
  } = options

  const plugins = [
    DevToolsInjection(),
    DevToolsServer(),
  ]

  if (build?.withApp) {
    plugins.push(DevToolsBuild({ outDir: build.outDir }))
  }

  if (builtinDevTools) {
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-ignore ignore the type error
    plugins.push(await import('@vitejs/devtools-rolldown').then(m => m.DevToolsRolldownUI()))

    // The built-in devframe plugins are collected under the shared "Vite+"
    // dock group (alongside Rolldown) so they don't each claim a top-level
    // dock button.
    const group = DEVTOOLS_VITEPLUS_GROUP_ID

    // Terminals + messages panels, provided by the official devframe plugins
    // (replacing the hub's built-in `~terminals` / `~messages` docks, which are
    // suppressed via `builtinDocks` in `createDevToolsContext`).
    plugins.push(createPluginFromDevframe(createTerminalsDevframe(), {
      dock: { groupId: group },
    }))
    plugins.push(createPluginFromDevframe(createMessagesDevframe(), {
      dock: { groupId: group },
    }))

    // Meta-introspection ("DevTools for the DevTools"), provided by the
    // official devframe inspector plugin (replaces the former
    // `@vitejs/devtools-self-inspect` package).
    plugins.push(createPluginFromDevframe(createInspectDevframe(), {
      dock: { groupId: group, icon: 'ph:stethoscope-duotone' },
    }))
  }

  return plugins
}

export {
  DevToolsBuild,
  DevToolsInjection,
  DevToolsServer,
}
