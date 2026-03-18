import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getInternalContext } from '../../context-internal'

export const authIdUpdate = defineRpcFunction({
  name: 'devtoolskit:internal:auth-id:update',
  type: 'action',
  setup: (context) => {
    const internal = getInternalContext(context)
    const storage = internal.storage.auth

    return {
      async handler(newAuthId: string): Promise<void> {
        const session = context.rpc.getCurrentRpcSession()
        if (!session)
          throw new Error('Failed to retrieve the current RPC session')

        if (storage.value().trusted[newAuthId])
          throw new Error(`The new auth ID "${newAuthId}" already exists`)

        const oldAuthId = session.meta.clientAuthId

        storage.mutate((state) => {
          state.trusted[newAuthId] = {
            authId: newAuthId,
            ua: '',
            origin: '',
            timestamp: Date.now(),
          }
          if (oldAuthId)
            delete state.trusted[oldAuthId]
        })

        session.meta.clientAuthId = newAuthId
      },
    }
  },
})
