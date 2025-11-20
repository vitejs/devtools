import { defineRpcFunction } from '@vitejs/devtools-kit'

export const terminalsRead = defineRpcFunction({
  name: 'vite:internal:terminals:read',
  type: 'query',
  setup: (context) => {
    return {
      async handler(id: string) {
        const seesion = context.terminals.sessions.get(id)
        if (!seesion) {
          throw new Error(`Terminal session with id "${id}" not found`)
        }
        return {
          buffer: (seesion.buffer ?? []),
          ts: Date.now(),
        }
      },
    }
  },
})
