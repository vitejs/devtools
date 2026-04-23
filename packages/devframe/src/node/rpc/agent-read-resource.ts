import type { AgentResourceContent } from 'devframe/types'
import { defineRpcFunction } from 'devframe'

export const agentReadResource = defineRpcFunction({
  name: 'devframe:agent:read-resource',
  type: 'query',
  setup: (ctx) => {
    return {
      async handler(id: string): Promise<AgentResourceContent> {
        return await ctx.agent.read(id)
      },
    }
  },
})
