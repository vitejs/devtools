import type { AgentResource } from 'devframe/types'
import { defineRpcFunction } from 'devframe'

export const agentListResources = defineRpcFunction({
  name: 'devframe:agent:list-resources',
  type: 'query',
  jsonSerializable: true,
  setup: (ctx) => {
    return {
      async handler(): Promise<readonly AgentResource[]> {
        return ctx.agent.list().resources
      },
    }
  },
})
