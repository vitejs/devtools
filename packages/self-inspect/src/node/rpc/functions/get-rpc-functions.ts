import { defineRpcFunction } from '@vitejs/devtools-kit'

export const getRpcFunctions = defineRpcFunction({
  name: 'devtoolskit:self-inspect:get-rpc-functions',
  type: 'query',
  agent: {
    description: 'List every RPC function registered on the devtools server, with metadata (name, type, whether it has args/returns schemas, dump, setup, handler). Useful for discovering what functionality the running devtools expose. Read-only.',
    title: 'List RPC functions',
  },
  setup: (context) => {
    return {
      handler: async () => {
        return Array.from(context.rpc.definitions.entries()).map(([name, fn]) => ({
          name,
          type: fn.type ?? 'query',
          cacheable: fn.cacheable ?? false,
          hasArgs: !!fn.args,
          hasReturns: !!fn.returns,
          hasDump: !!fn.dump,
          hasSetup: !!fn.setup,
          hasHandler: !!fn.handler,
        }))
      },
    }
  },
})
