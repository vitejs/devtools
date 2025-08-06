import { defineRpcFunction } from '@vitejs/devtools-kit'

export const openInFinder = defineRpcFunction({
  name: 'vite:open-in-finder',
  type: 'action',
  setup: () => ({
    handler: async (path: string) => {
      await import('open').then(r => r.default(path))
    },
  }),
})
