import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { registerRolldownAgentTools } from './tools'

export function DevToolsRolldownAgent(): PluginWithDevTools {
  return {
    name: 'vite:devtools:rolldown-agent',
    devtools: {
      setup: registerRolldownAgentTools,
    },
  }
}

export { registerRolldownAgentTools } from './tools'
