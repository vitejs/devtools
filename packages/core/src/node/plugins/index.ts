import type { Plugin } from 'vite'
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
   * Start the injected overlay in passive mode: the floating docks stay hidden
   * and a console hint invites the developer to reveal them with a keyboard
   * shortcut. Activating once persists a flag in the project's `node_modules`,
   * so later dev sessions on this machine boot straight into normal mode.
   *
   * Set to `false` to always show the docks.
   *
   * @default true
   */
  passive?: boolean

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
    passive = true,
  } = options

  const plugins = [
    DevToolsInjection(),
    DevToolsServer({ passive }),
  ]

  if (build?.withApp) {
    plugins.push(DevToolsBuild({ outDir: build.outDir }))
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
