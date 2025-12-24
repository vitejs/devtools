import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { createDebug } from 'obug'

const debug = createDebug('vite:devtools:rpc:state:subscribe')

export const sharedStateSubscribe = defineRpcFunction({
  name: 'vite:internal:rpc:server-state:subscribe',
  type: 'event',
  setup: (context: DevToolsNodeContext) => {
    return {
      handler: async (key: string): Promise<void> => {
        const session = context.rpc.getCurrentRpcSession()
        if (!session)
          return
        debug('subscribe', { key, session: session.meta.id })
        session.meta.subscribedStates.add(key)
      },
    }
  },
})
