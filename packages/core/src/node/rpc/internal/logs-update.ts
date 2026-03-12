import type { DevToolsLogEntry, DevToolsLogEntryInput } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const logsUpdate = defineRpcFunction({
  name: 'devtoolskit:internal:logs:update',
  type: 'action',
  setup: (context) => {
    return {
      async handler(id: string, patch: Partial<DevToolsLogEntryInput>): Promise<DevToolsLogEntry | null> {
        return await context.logs.update(id, patch) ?? null
      },
    }
  },
})
