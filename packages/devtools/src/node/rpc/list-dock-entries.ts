import { defineRpcFunction } from '@vitejs/devtools-kit'

export const listDockEntries = defineRpcFunction({
  name: 'vite:core:list-dock-entries',
  type: 'query',
  setup: (context) => {
    return {
      handler: () => Array.from(context.docks.values()),
    }
  },
})
