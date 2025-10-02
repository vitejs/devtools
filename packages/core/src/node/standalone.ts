import type { Plugin, ResolvedConfig } from 'vite'
import type { DevToolsNodeContext } from '../../../kit/src'
import process from 'node:process'
import { loadConfigFromFile, resolveConfig } from 'vite'
import { createDevToolsContext } from './context'
import { DevTools } from './plugins'

export interface StandaloneDevToolsOptions {
  cwd?: string
  port?: number
  config?: string
  command?: 'build' | 'serve'
  mode?: 'development' | 'production'
}

export async function startStandaloneDevTools(options: StandaloneDevToolsOptions = {}): Promise<{
  config: ResolvedConfig
  context: DevToolsNodeContext
}> {
  const {
    cwd = process.cwd(),
    command = 'build',
    mode = 'production',
  } = options

  const loaded = await loadConfigFromFile(
    {
      command,
      mode,
    },
    options.config,
    cwd,
  )

  // Inject devtools plugin
  const config = loaded?.config || {}
  config.plugins ||= []
  config.plugins.push(DevTools())

  dedupeVitePlugins(
    config.plugins as Plugin[],
    plugin => plugin.name?.startsWith('vite:devtools'),
  )

  const resolved = await resolveConfig(
    config,
    command,
    mode,
  )

  const context = await createDevToolsContext(resolved)

  return {
    config: resolved,
    context,
  }
}

export function dedupeVitePlugins(plugins: Plugin[], include: (plugin: Plugin) => boolean) {
  const toDelete: number[] = []
  const map = new Map<string, Plugin>()

  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i]
    if (!plugin || !include(plugin)) {
      continue
    }
    if (map.has(plugin.name)) {
      toDelete.push(i)
    }
    else {
      map.set(plugin.name, plugin)
    }
  }

  toDelete.sort((a, b) => b - a)
  for (const i of toDelete) {
    plugins.splice(i, 1)
  }

  return plugins
}
