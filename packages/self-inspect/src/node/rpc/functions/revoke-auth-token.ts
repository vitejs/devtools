import { getInternalContext } from '@vitejs/devtools'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const revokeAuthToken = defineRpcFunction({
  name: 'devtoolskit:self-inspect:revoke-auth-token',
  type: 'action',
  setup: (context) => {
    const internal = getInternalContext(context)
    const storage = internal.storage.auth
    return {
      handler: async (authId: string) => {
        storage.mutate((state) => {
          delete state.trusted[authId]
        })
      },
    }
  },
})
