import { defineRpcFunction } from '@vitejs/devtools-kit'

export const terminalsRead = defineRpcFunction({
  name: 'vite:internal:terminals:read',
  type: 'query',
  setup: (context) => {
    return {
      async handler(id: string) {
        const session = context.terminals.sessions.get(id)
        if (!session) {
          throw new Error(`Terminal session with id "${id}" not found`)
        }
        return {
          buffer: (session.buffer ?? []),
          ts: Date.now(),
        }
      },
    }
  },
})
