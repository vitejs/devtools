import { defineRpcFunction } from '@vitejs/devtools-kit'

export const getDocks = defineRpcFunction({
  name: 'devtoolskit:self-inspect:get-docks',
  type: 'query',
  setup: (context) => {
    return {
      handler: async () => {
        return context.docks.values()
      },
    }
  },
})
