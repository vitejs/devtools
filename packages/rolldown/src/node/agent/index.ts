import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { registerRolldownAgentTools } from './tools'

export const rolldownAgent = {
  namespace: 'rolldown',
  setup(ctx: ViteDevToolsNodeContext) {
    registerRolldownAgentTools(ctx)
  },
} as const

export { registerRolldownAgentTools } from './tools'
