import { defineRpcFunction } from '@vitejs/devtools-kit'

export const rpcServerList = defineRpcFunction({
  name: 'vite:internal:rpc:server:list',
  type: 'static',
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
