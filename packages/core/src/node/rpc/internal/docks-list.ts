import { defineRpcFunction } from '@vitejs/devtools-kit'

export const docksList = defineRpcFunction({
  name: 'vite:internal:docks:list',
  type: 'static',
  setup: (context) => {
    return {
      handler: () => Array.from(context.docks.values()),
    }
  },
})
