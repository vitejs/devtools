import type { DevToolsHostDockConfig, ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { Plugin, ResolvedConfig } from 'vite'
import process from 'node:process'
import { createDevToolsContext } from './context'
import { DevTools } from './plugins'

export interface StandaloneDevToolsOptions {
  cwd?: string
  port?: number
  config?: string
  command?: 'build' | 'serve'
  mode?: 'development' | 'production'
  /** Host-wide dock defaults — see {@link DevToolsHostDockConfig}. */
  dock?: DevToolsHostDockConfig
}

export async function startStandaloneDevTools(options: StandaloneDevToolsOptions = {}): Promise<{
  config: ResolvedConfig
  context: ViteDevToolsNodeContext
}> {
  const {
    cwd = process.cwd(),
    command = 'build',
    mode = 'production',
    dock,
  } = options

  const { resolveConfig } = await import('vite')
  const resolved = await resolveConfig(
    {
      configFile: options.config,
      root: cwd,
      plugins: [
        DevTools({ cwd, dock }),
      ],
    },
    command,
    mode,
  )

  dedupeVitePlugins(
    resolved.plugins as Plugin[],
    plugin => plugin.name?.startsWith('vite:devtools'),
  )

  // `resolveConfig` only resolves the `DevTools()` plugin's own hooks; it
  // never surfaces the options it was constructed with, so `dock` is passed
  // straight through rather than picked back out of `resolved.plugins`.
  const context = await createDevToolsContext(resolved, undefined, { dock })

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
