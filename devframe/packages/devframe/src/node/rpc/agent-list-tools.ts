import type { AgentTool } from 'devframe/types'
import { defineRpcFunction } from 'devframe'

export const agentListTools = defineRpcFunction({
  name: 'devframe:agent:list-tools',
  type: 'query',
  jsonSerializable: true,
  setup: (ctx) => {
    return {
      async handler(): Promise<readonly AgentTool[]> {
        return ctx.agent.list().tools
      },
    }
  },
})
