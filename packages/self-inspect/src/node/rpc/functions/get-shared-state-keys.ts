import { defineRpcFunction } from '@vitejs/devtools-kit'

export const getSharedStateKeys = defineRpcFunction({
  name: 'devtoolskit:self-inspect:get-shared-state-keys',
  type: 'query',
  setup: (context) => {
    return {
      handler: async () => {
        return context.rpc.sharedState.keys()
      },
    }
  },
})
