import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { rolldownAgent } from '@vitejs/devtools-rolldown/node/agent'

export interface DevToolsAgent {
  namespace: string
  setup: (ctx: ViteDevToolsNodeContext) => void | Promise<void>
}

export const builtinAgents: readonly DevToolsAgent[] = [
  rolldownAgent,
]

export async function registerBuiltinAgents(ctx: ViteDevToolsNodeContext) {
  for (const agent of builtinAgents) {
    await agent.setup(ctx)
  }
}
