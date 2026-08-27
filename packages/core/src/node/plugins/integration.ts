import type { Plugin, ResolvedConfig, ViteBuilder } from 'vite'
import type { DevToolsConfig, ResolvedDevToolsConfig } from '../config'
import { isDevToolsEnabled, normalizeDevToolsConfig } from '../config'
import { createDevToolsPlugins, resolveDevToolsPluginOptions } from './index'

type DevToolsEnvironment = ResolvedConfig['environments'][string]

export interface DevToolsIntegrationOptions {
  command: 'serve' | 'build'
  root: string
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
      const { startDevTools } = await import('../start')
      await startDevTools({
        ...devtoolsConfig.config,
        root: devtoolsConfig.config.root ?? config.root,
      }, devtoolsConfig)
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

function DevToolsConfigIntegration(
  devtools: DevToolsIntegrationConfig,
  devtoolsConfig: ResolvedDevToolsConfig,
  command: 'serve' | 'build',
): Plugin {
  return {
    name: 'vite:devtools:config',
    enforce: 'pre',
    apply: command,
    configResolved: {
      order: 'pre',
      handler() {
        const resolved = normalizeDevToolsConfig(devtools.options, devtools.host)
        devtoolsConfig.apply = resolved.apply
        devtoolsConfig.config = resolved.config
        devtoolsConfig.enabled = resolved.enabled
      },
    },
  }
}

export async function DevToolsIntegration(options: DevToolsIntegrationOptions): Promise<Plugin[]> {
  const { command, devtools, root } = options
  const devtoolsConfig = normalizeDevToolsConfig(devtools.options, devtools.host)
  const enabled = isDevToolsEnabled(devtoolsConfig, command)
  if (!enabled) {
    return []
  }

  const pluginOptions = resolveDevToolsPluginOptions(devtoolsConfig, root)
  const configPlugin = DevToolsConfigIntegration(devtools, devtoolsConfig, command)
  if (command === 'serve') {
    return [configPlugin, ...await createDevToolsPlugins(pluginOptions, devtoolsConfig)]
  }

  const plugins = [configPlugin, DevToolsBuildIntegration(devtoolsConfig)]
  if (devtoolsConfig.config.build?.withApp) {
    plugins.push(...await createDevToolsPlugins(pluginOptions, devtoolsConfig))
  }
  return plugins
}
