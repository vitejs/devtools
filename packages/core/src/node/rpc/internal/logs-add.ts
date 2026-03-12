import type { DevToolsLogEntry, DevToolsLogEntryInput } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const logsAdd = defineRpcFunction({
  name: 'devtoolskit:internal:logs:add',
  type: 'action',
  setup: (context) => {
    return {
      async handler(input: DevToolsLogEntryInput): Promise<DevToolsLogEntry> {
        return context.logs.add(Object.assign(input, { source: 'client' as const }))
      },
    }
  },
})
