import type { Plugin } from 'vite'
import type { ResolvedDevToolsConfig } from '../config'
import type { DevToolsOptions } from '../plugin-options'
import { DevToolsBuild } from './build'
import { DevToolsBuiltin } from './builtin'
import { DevToolsInjection } from './injection'
import { DevToolsServer } from './server'

export type { DevToolsOptions } from '../plugin-options'

export function DevTools(options: DevToolsOptions = {}): Promise<Plugin[]> {
  return createDevToolsPlugins(options)
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
    { name: 'vite:devtools' },
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
