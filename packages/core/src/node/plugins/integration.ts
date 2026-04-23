import type { Plugin, ResolvedConfig } from 'vite'
import type { DevToolsConfig, ResolvedDevToolsConfig } from '../config'
import { resolveDevToolsConfig } from '../config'

export interface DevToolsIntegrationOptions {
  devtools?: DevToolsConfig | boolean
  host?: string | boolean
}

export function DevToolsIntegration(options: DevToolsIntegrationOptions = {}): Plugin {
  let resolvedConfig: ResolvedConfig | undefined
  let normalizedDevToolsConfig: ResolvedDevToolsConfig | undefined

  return {
    name: 'vite:devtools:integration',
    apply: 'build',
    configResolved: {
      order: 'post',
      handler(config) {
        resolvedConfig = config
        normalizedDevToolsConfig = resolveDevToolsConfig(
          options.devtools,
          options.host ?? config.server.host,
          config.devtools,
        )

        if (!normalizedDevToolsConfig.enabled) {
          return
        }
        config.build.rolldownOptions ??= {}
        config.build.rolldownOptions.devtools ??= {}
      },
    },
    buildApp: {
      order: 'post',
      async handler(builder) {
        const config = resolvedConfig ?? builder.config

        if (!normalizedDevToolsConfig?.enabled) {
          return
        }

        try {
          const { start } = await import('@vitejs/devtools/cli-commands')
          await start(normalizedDevToolsConfig.config)
        }
        catch (error: any) {
          config.logger.error(
            `Failed to run Vite DevTools: ${error?.message || error?.stack || error}`,
            { error },
          )
        }
      },
    },
  }
}
