import type { DevToolsMessageEntry, DevToolsMessageEntryFrom, DevToolsMessageEntryInput } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const messagesAdd = defineRpcFunction({
  name: 'devtoolskit:internal:messages:add',
  type: 'action',
  setup: (context) => {
    return {
      async handler(input: DevToolsMessageEntryInput): Promise<DevToolsMessageEntry> {
        const handle = await context.messages.add({ ...input, from: 'browser' as DevToolsMessageEntryFrom } as DevToolsMessageEntryInput)
        return handle.entry
      },
    }
  },
})
