import { revokeAuthToken } from '@vitejs/devtools'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const revokeAuthTokenRpc = defineRpcFunction({
  name: 'devtoolskit:self-inspect:revoke-auth-token',
  type: 'action',
  setup: (context) => {
    return {
      handler: async (authId: string) => {
        await revokeAuthToken(context, authId)
      },
    }
  },
})
