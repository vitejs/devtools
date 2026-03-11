import type { DevToolsLogEntry } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const logsList = defineRpcFunction({
  name: 'devtoolskit:internal:logs:list',
  type: 'static',
  setup: (context) => {
    return {
      async handler(): Promise<DevToolsLogEntry[]> {
        return Array.from(context.logs.entries.values())
      },
    }
  },
})
