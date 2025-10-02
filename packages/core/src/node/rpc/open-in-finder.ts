import { defineRpcFunction } from '../../../../kit/src'

export const openInFinder = defineRpcFunction({
  name: 'vite:core:open-in-finder',
  type: 'action',
  setup: () => {
    return {
      handler: async (path: string) => {
        await import('open').then(r => r.default(path))
      },
    }
  },
})
