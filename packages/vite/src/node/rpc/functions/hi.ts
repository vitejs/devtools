import { defineRpcFunction } from '@vitejs/devtools-kit'

export const viteHi = defineRpcFunction({
  name: 'vite:hi',
  type: 'query',
  setup: (context) => {
    return {
      handler: async () => {
        return {
          message: 'Hi from server.',
          cwd: context.cwd,
          timestamp: Date.now(),
        }
      },
    }
  },
})
