import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getInternalContext } from '@vitejs/devtools/internal'

export const getAuthTokens = defineRpcFunction({
  name: 'devtoolskit:self-inspect:get-auth-tokens',
  type: 'query',
  setup: (context) => {
    const internal = getInternalContext(context)
    const storage = internal.storage.auth
    return {
      handler: async () => {
        const trusted = storage.value().trusted
        return Object.values(trusted)
      },
    }
  },
})
