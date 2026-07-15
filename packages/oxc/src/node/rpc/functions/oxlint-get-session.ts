import { defineOxcRpc } from '../_define'
import { getLogsManager } from '../utils'

export const oxlintGetSession = defineOxcRpc({
  name: 'devtools-oxc:get-lint-session',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  setup: context => {
    return {
      handler: async ({ sessionId }: { sessionId: string }) => {
        const logsManager = getLogsManager(context)
        const session = await logsManager.loadSession(sessionId)
        return session
      },
    }
  },
})
