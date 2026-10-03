import type { Plugin, ResolvedConfig, ViteBuilder } from 'vite'
import type { DevToolsConfig, ResolvedDevToolsConfig } from '../config'
import process from 'node:process'
import { isDevToolsEnabled, normalizeDevToolsConfig } from '../config'
import { DevToolsConfigPlugin } from './config'
import { createDevToolsPlugins, resolveDevToolsPluginOptions } from './index'

type DevToolsEnvironment = ResolvedConfig['environments'][string]
const DEVTOOLS_BUILD_INTEGRATION_NAME = 'vite:devtools:integration'

export interface DevToolsIntegrationOptions {
  command: 'serve' | 'build'
  root?: string
  devtools: DevToolsIntegrationConfig
}

export interface DevToolsIntegrationConfig {
  host?: string | boolean
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
) {
  const config = (builder as ViteBuilder).config
  if (!config.plugins.some(plugin => plugin.name === DEVTOOLS_BUILD_INTEGRATION_NAME))
    return

  const devtoolsConfig = config.devtools as unknown as ResolvedDevToolsConfig | false
  if (!devtoolsConfig)
    return

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
    name: DEVTOOLS_BUILD_INTEGRATION_NAME,
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
  const { command, devtools, root = process.cwd() } = options
  const devtoolsConfig = normalizeDevToolsConfig(devtools.options, devtools.host)
  const enabled = isDevToolsEnabled(devtoolsConfig, command)
  if (!enabled) {
    return []
  }

  const pluginOptions = resolveDevToolsPluginOptions(devtoolsConfig, root)
  const configPlugin = DevToolsConfigPlugin(devtools.options, devtoolsConfig, command)
  if (command === 'serve') {
    return [configPlugin, ...await createDevToolsPlugins(pluginOptions, devtoolsConfig)]
  }

  const plugins = [configPlugin, DevToolsBuildIntegration(devtoolsConfig)]
  if (devtoolsConfig.config.build?.withApp) {
    plugins.push(...await createDevToolsPlugins(pluginOptions, devtoolsConfig))
  }
  return plugins
}
