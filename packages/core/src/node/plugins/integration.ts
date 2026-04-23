import type { Plugin, ResolvedConfig, ViteBuilder } from 'vite'
import type { ResolvedDevToolsConfig } from '../config'

type DevToolsEnvironment = ResolvedConfig['environments'][string]

export interface DevToolsIntegrationOptions {
  config: ResolvedConfig
}

function getDevToolsEnvironments(config: ResolvedConfig): DevToolsEnvironment[] {
  const devToolsConfig = config.devtools as ResolvedDevToolsConfig
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

export async function runDevTools(builder: unknown) {
  const config = (builder as ViteBuilder).config
  for (const _environment of getDevToolsEnvironments(config)) {
    try {
      const { start } = await import('@vitejs/devtools/cli-commands')
      await start(config.devtools.config)
    }
    catch (error: any) {
      config.logger.error(
        `Failed to run Vite DevTools: ${error?.message || error?.stack || error}`,
        { error },
      )
    }
  }
}

export function DevToolsIntegration(_options: DevToolsIntegrationOptions): Plugin {
  return {
    name: 'vite:devtools:integration',
    apply: 'build',
    configResolved: {
      order: 'post',
      handler(config) {
        // Enable `rolldownOptions.devtools` if the environment is selected, or for all environments by default.
        for (const environment of getDevToolsEnvironments(config)) {
          environment.build.rolldownOptions.devtools ??= {}
        }
      },
    },
  }
}
