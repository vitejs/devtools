import { defineRpcFunction } from '@vitejs/devtools-kit'

export const openInEditor = defineRpcFunction({
  name: 'vite:core:open-in-editor',
  type: 'action',
  setup: () => {
    return {
      handler: async (path: string) => {
        await import('launch-editor').then(r => r.default(path))
      },
    }
  },
})
