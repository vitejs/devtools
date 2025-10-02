import { defineRpcFunction } from '../../../../kit/src'

export const listRpcFunctions = defineRpcFunction({
  name: 'vite:core:list-rpc-functions',
  type: 'action',
  setup: (context) => {
    return {
      async handler() {
        // TODO: add also schema
        return Object.fromEntries(
          Array.from(context.rpc.definitions.entries())
            .map(([name, fn]) => [name, {
              type: fn.type,
            }]),
        )
      },
    }
  },
})
