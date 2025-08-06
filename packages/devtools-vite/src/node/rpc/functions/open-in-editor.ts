import { defineRpcFunction } from '../utils'

export const openInEditor = defineRpcFunction({
  name: 'vite:open-in-editor',
  type: 'action',
  setup: () => ({
    handler: async (path: string) => {
      await import('launch-editor').then(r => r.default(path))
    },
  }),
})
