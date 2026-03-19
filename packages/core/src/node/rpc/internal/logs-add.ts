import type { DevToolsLogEntry, DevToolsLogEntryInput } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const logsAdd = defineRpcFunction({
  name: 'devtoolskit:internal:logs:add',
  type: 'action',
  setup: (context) => {
    return {
      async handler(input: DevToolsLogEntryInput): Promise<DevToolsLogEntry> {
        // @ts-expect-error - source is not in the type
        const handle = await context.logs.add({ ...input, from: 'browser' as DevToolsLogEntryFrom })
        return handle.entry
      },
    }
  },
})
