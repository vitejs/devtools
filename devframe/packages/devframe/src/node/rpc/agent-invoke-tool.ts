import { defineRpcFunction } from 'devframe'

export const agentInvokeTool = defineRpcFunction({
  name: 'devframe:agent:invoke-tool',
  type: 'action',
  setup: (ctx) => {
    return {
      async handler(id: string, args: unknown): Promise<unknown> {
        return await ctx.agent.invoke(id, args)
      },
    }
  },
})
