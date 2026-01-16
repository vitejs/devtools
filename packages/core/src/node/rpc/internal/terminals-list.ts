import type { DevToolsTerminalSessionBase } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const terminalsList = defineRpcFunction({
  name: 'devtoolskit:internal:terminals:list',
  type: 'static',
  setup: (context) => {
    return {
      async handler() {
        return Array.from(context.terminals.sessions.values())
          .map((i): DevToolsTerminalSessionBase => {
            return {
              id: i.id,
              title: i.title,
              description: i.description,
              status: i.status,
            }
          })
      },
    }
  },
})
