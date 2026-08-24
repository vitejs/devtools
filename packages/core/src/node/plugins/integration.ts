import type { Plugin, ResolvedConfig, ViteBuilder } from 'vite'
import type { DevToolsConfig, ResolvedDevToolsConfig } from '../config'
import type { DevToolsOptions } from '../plugin-options'
import { isDevToolsEnabled, normalizeDevToolsConfig } from '../config'
import { createDevToolsPlugins } from './index'

type DevToolsEnvironment = ResolvedConfig['environments'][string]

export interface DevToolsIntegrationOptions {
  config: ResolvedConfig
  devtools: DevToolsIntegrationConfig
}

export interface DevToolsIntegrationConfig {
  host: string
  options: boolean | DevToolsConfig | undefined
}

function getDevToolsEnvironments(
  config: ResolvedConfig,
  devToolsConfig: ResolvedDevToolsConfig,
): DevToolsEnvironment[] {
  const environmentNames = devToolsConfig.config.environments ?? Object.keys(config.environments)
  const environments: DevToolsEnvironment[] = []

  for (const environmentName of environmentNames) {
    const environment = config.environments[environmentName]
    if (environment) {
      environments.push(environment)
    }
  }

  return environments
}

export async function runDevTools(
  builder: unknown,
  devtools: DevToolsIntegrationConfig,
) {
  const config = (builder as ViteBuilder).config
  const devtoolsConfig = normalizeDevToolsConfig(devtools.options, devtools.host)
  if (!isDevToolsEnabled(devtoolsConfig, config.command))
    return
  for (const _environment of getDevToolsEnvironments(config, devtoolsConfig)) {
    try {
      const { start } = await import('../cli-commands')
      await start(devtoolsConfig.config)
    }
    catch (error: any) {
      config.logger.error(
        `Failed to run Vite DevTools: ${error?.message || error?.stack || error}`,
        { error },
      )
    }
  }
}

function DevToolsBuildIntegration(devtoolsConfig: ResolvedDevToolsConfig): Plugin {
  return {
    name: 'vite:devtools:integration',
    apply: 'build',
    configResolved: {
      order: 'post',
      handler(config) {
        // Enable `rolldownOptions.devtools` if the environment is selected, or for all environments by default.
        for (const environment of getDevToolsEnvironments(config, devtoolsConfig)) {
          environment.build.rolldownOptions.devtools ??= {}
        }
      },
    },
  }
}

export async function DevToolsIntegration(options: DevToolsIntegrationOptions): Promise<Plugin[]> {
  const { config, devtools } = options
  const devtoolsConfig = normalizeDevToolsConfig(devtools.options, devtools.host)
  const enabled = isDevToolsEnabled(devtoolsConfig, config.command)
  if (!enabled) {
    return []
  }

  const {
    branding,
    build,
    builtinDevTools,
    dockPreferences,
    embeddedVisibility,
  } = devtoolsConfig.config
  const pluginOptions: DevToolsOptions = {
    branding,
    build,
    builtinDevTools,
    cwd: config.root,
    dockPreferences,
    embeddedVisibility,
  }
  if (config.command === 'serve') {
    return createDevToolsPlugins(pluginOptions, devtoolsConfig)
  }

  const plugins = [DevToolsBuildIntegration(devtoolsConfig)]
  if (devtoolsConfig.config.build?.withApp) {
    plugins.push(...await createDevToolsPlugins(pluginOptions, devtoolsConfig))
  }
  return plugins
}
