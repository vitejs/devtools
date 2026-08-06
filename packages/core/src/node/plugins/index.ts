import type { DevToolsHostDockConfig } from '@vitejs/devtools-kit'
import type { Plugin } from 'vite'
import type { DevToolsVisibility } from './injection'
import { DevToolsBuild } from './build'
import { DevToolsBuiltin } from './builtin'
import { DevToolsInjection } from './injection'
import { DevToolsServer } from './server'

export interface DevToolsOptions {
  /** Directory to search for installed integrations. */
  cwd?: string
  /**
   * Include the Vite builtin devtools UI.
   *
   * @default true
   */
  builtinDevTools?: boolean

  /**
   * Initial visibility of the injected overlay.
   *
   * - `'normal'` — show the docks immediately.
   * - `'passive'` — the floating docks stay hidden and a console hint invites
   *   the developer to reveal them with a keyboard shortcut. Activating once
   *   persists a flag in the project's `node_modules`, so later dev sessions on
   *   this machine boot straight into normal mode.
   * - `'hidden'` — always keep the docks hidden; the shortcut reveals them for
   *   the current session only, without remembering the choice.
   *
   * @default 'normal'
   */
  visibility?: DevToolsVisibility

  /**
   * Host-wide dock defaults — category order, float-mode capacity, and
   * initial window placement. A plugin may additionally declare its own
   * `devtools.dock.categoryOrder`; this option decides the rest, and wins
   * over a plugin's `categoryOrder` where both set the same category.
   */
  dock?: DevToolsHostDockConfig

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
    visibility = 'normal',
    dock,
  } = options

  const plugins = [
    DevToolsInjection({ visibility }),
    DevToolsServer({ dock }),
  ]

  if (build?.withApp) {
    plugins.push(DevToolsBuild({ outDir: build.outDir, dock }))
  }

  plugins.unshift(
    ...await DevToolsBuiltin({
      cwd: options.cwd,
      builtinDevTools,
    }),
  )

  return plugins
}

export {
  DevToolsBuild,
  DevToolsInjection,
  DevToolsServer,
}
