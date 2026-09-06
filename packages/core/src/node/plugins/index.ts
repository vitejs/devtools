import type { Plugin } from 'vite'
import type { DevToolsConfig, ResolvedDevToolsConfig } from '../config'
import type { DevToolsOptions } from '../plugin-options'
import { normalizeDevToolsConfig } from '../config'
import { DevToolsBuild } from './build'
import { DevToolsBuiltin } from './builtin'
import { DevToolsConfigPlugin } from './config'
import { DevToolsInjection } from './injection'
import { DevToolsServer } from './server'

export type { DevToolsOptions } from '../plugin-options'

export function resolveDevToolsPluginOptions(
  config: ResolvedDevToolsConfig,
  cwd: string,
): DevToolsOptions {
  const {
    branding,
    build,
    builtinDevTools,
    dockPreferences,
    embeddedVisibility,
    renderers,
  } = config.config

  return {
    branding,
    build,
    builtinDevTools,
    cwd,
    dockPreferences,
    embeddedVisibility,
    renderers,
  }
}

export async function DevTools(options: DevToolsOptions = {}): Promise<Plugin[]> {
  const { cwd: _cwd, ...configOptions } = options
  const config: DevToolsConfig = { ...configOptions, enabled: true }
  const resolvedConfig = normalizeDevToolsConfig(config, 'localhost')
  return [
    DevToolsConfigPlugin(config, resolvedConfig),
    ...await createDevToolsPlugins(options, resolvedConfig),
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
    renderers,
  } = options

  const ui = { branding, embeddedVisibility, dockPreferences }

  const plugins = [
    DevToolsInjection(),
    DevToolsServer(ui, resolvedConfig, renderers),
  ]

  if (build?.withApp) {
    plugins.push(DevToolsBuild({
      outDir: build.outDir,
      renderers,
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
