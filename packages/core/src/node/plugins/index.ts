import type { Plugin } from 'vite'
import { DevToolsBuild } from './build'
import { DevToolsBuiltin } from './builtin'
import { DevToolsInjection } from './injection'
import { DevToolsRolldownBuildFlag } from './rolldown-build-flag'
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
    // No-op unless a build is spawned by the Rolldown "Run build" button
    // (gated on the `VITE_DEVTOOLS_ROLLDOWN` env var).
    DevToolsRolldownBuildFlag(),
  ]

  if (build?.withApp) {
    plugins.push(DevToolsBuild({ outDir: build.outDir }))
  }

  plugins.unshift(
    ...await DevToolsBuiltin({
      cwd: options.cwd,
      vitePlusLaunchers: builtinDevTools,
    }),
  )

  return plugins
}

export {
  DevToolsBuild,
  DevToolsInjection,
  DevToolsRolldownBuildFlag,
  DevToolsServer,
}
