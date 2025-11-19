import { defineRpcFunction } from '@vitejs/devtools-kit'

export const listTerminals = defineRpcFunction({
  name: 'vite:core:list-terminals',
  type: 'action',
  setup: (context) => {
    return {
      async handler() {
        return Array.from(context.terminals.sessions.values())
      },
    }
  },
})
