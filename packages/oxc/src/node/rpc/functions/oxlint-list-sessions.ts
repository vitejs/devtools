import { defineOxcRpc } from '../_define'
import { getLogsManager } from '../utils'

export const oxlintListSessions = defineOxcRpc({
  name: 'devtools-oxc:list-lint-session',
  type: 'query',
  jsonSerializable: true,
  setup: context => {
    return {
      handler: async () => {
        const logsManager = getLogsManager(context)
        const sessions = await logsManager.list()
        return sessions
      },
    }
  },
})
