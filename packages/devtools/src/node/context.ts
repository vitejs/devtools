import type { DevToolsSetupContext } from '@vitejs/devtools-kit'
import type { ResolvedConfig } from 'vite'
import { RpcFunctionsHost } from './functions'
import { DevtoolsViewHost } from './views'

export async function createDevToolsContext(viteConfig: ResolvedConfig): Promise<DevToolsSetupContext> {
  const cwd = viteConfig.root

  const context: DevToolsSetupContext = {
    cwd,
    viteConfig,
    mode: viteConfig.command === 'serve' ? 'dev' : 'build',
    rpc: new RpcFunctionsHost(),
    views: new DevtoolsViewHost(),
  }

  const plugins = viteConfig.plugins.filter(plugin => 'devtools' in plugin)

  for (const plugin of plugins) {
    try {
      await plugin.devtools?.setup?.(context)
    }
    catch (error) {
      console.error(`[Vite DevTools] Error setting up plugin ${plugin.name}:`, error)
      throw error
    }
  }

  return context
}
