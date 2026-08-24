import type { Plugin } from 'vite'
import type { ResolvedDevToolsConfig } from '../config'
import type { DevToolsOptions } from '../plugin-options'
import { DevToolsBuild } from './build'
import { DevToolsBuiltin } from './builtin'
import { DevToolsInjection } from './injection'
import { DevToolsServer } from './server'

export type { DevToolsOptions } from '../plugin-options'

export async function DevTools(options: DevToolsOptions = {}): Promise<Plugin[]> {
  return [
    { name: 'vite:devtools' },
    ...await createDevToolsPlugins(options),
  ]
}

export async function createDevToolsPlugins(
  options: DevToolsOptions = {},
  resolvedConfig?: ResolvedDevToolsConfig,
): Promise<Plugin[]> {
  const {
    builtinDevTools = true,
    build,
    branding,
    embeddedVisibility = 'normal',
    dockPreferences,
  } = options

  const ui = { branding, embeddedVisibility, dockPreferences }

  const plugins = [
    DevToolsInjection(),
    DevToolsServer(ui, resolvedConfig),
  ]

  if (build?.withApp) {
    plugins.push(DevToolsBuild({
      outDir: build.outDir,
      resolvedConfig,
      ui,
    }))
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
