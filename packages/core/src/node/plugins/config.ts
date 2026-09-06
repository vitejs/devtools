import type { Plugin } from 'vite'
import type { DevToolsConfig, ResolvedDevToolsConfig } from '../config'
import { normalizeDevToolsConfig } from '../config'
import { diagnostics } from '../diagnostics'

export function DevToolsConfigPlugin(
  config: boolean | DevToolsConfig | undefined,
  resolvedConfig: ResolvedDevToolsConfig,
  command?: 'serve' | 'build',
): Plugin {
  return {
    name: 'vite:devtools',
    enforce: 'pre',
    apply: command,
    configResolved: {
      order: 'pre',
      handler(viteConfig) {
        if (viteConfig.plugins.filter(plugin => plugin.name === 'vite:devtools').length > 1)
          throw diagnostics.DTK0034()

        Object.assign(
          resolvedConfig,
          normalizeDevToolsConfig(config, viteConfig.server.host),
        )
        Object.assign(viteConfig, { devtools: resolvedConfig })
      },
    },
  }
}
