import { defineRpcFunction } from '@vitejs/devtools-kit'

export const getSharedStateKeys = defineRpcFunction({
  name: 'devtoolskit:self-inspect:get-shared-state-keys',
  type: 'query',
  agent: {
    description: 'List the keys of all shared-state entries published by the devtools server. Read-only. Combine with the `devframe://state/<key>` MCP resource to inspect values.',
    title: 'List shared-state keys',
  },
  setup: (context) => {
    return {
      handler: async () => {
        return context.rpc.sharedState.keys()
      },
    }
  },
})
