import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getInternalContext } from '@vitejs/devtools/internal'

export const revokeAuthTokenRpc = defineRpcFunction({
  name: 'devtoolskit:self-inspect:revoke-auth-token',
  type: 'action',
  setup: (context) => {
    const internal = getInternalContext(context)
    return {
      handler: async (authId: string) => {
        await internal.revokeAuthToken(authId)
      },
    }
  },
})
