import type { DevToolsMessageEntry, DevToolsMessageEntryInput } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const messagesUpdate = defineRpcFunction({
  name: 'devtoolskit:internal:messages:update',
  type: 'action',
  setup: (context) => {
    return {
      async handler(id: string, patch: Partial<DevToolsMessageEntryInput>): Promise<DevToolsMessageEntry | null> {
        return await context.messages.update(id, patch) ?? null
      },
    }
  },
})
