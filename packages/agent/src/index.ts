import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { rolldownAgentTools } from './node/rolldown'
import { viteAgentTools } from './node/vite'

export function DevToolsAgent(): PluginWithDevTools {
  return {
    name: 'vite:devtools:agent',
    apply: 'serve',
    devtools: {
      setup(context) {
        // Core auto-loads this plugin; an explicit user entry can coexist.
        for (const tool of [...rolldownAgentTools, ...viteAgentTools]) {
          if (!context.rpc.definitions.has(tool.name))
            context.rpc.register(tool as Parameters<typeof context.rpc.register>[0])
        }
      },
    },
  }
}
