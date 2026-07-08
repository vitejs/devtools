import { defineRpcFunction } from '@vitejs/devtools-kit'
import { revokeAuthToken } from 'devframe/node/auth'
import { getInternalContext } from 'devframe/node/hub-internals'

/**
 * `devtoolskit:internal:auth:revoke` — de-authorize the calling browser.
 * Revokes the current session's node-issued bearer token: removes it from the
 * trusted store and notifies every connection using it (via the
 * `devframe:auth:revoked` broadcast), which drops those clients back to
 * untrusted. A trusted-only action — an untrusted client can't reach it.
 */
export const authRevoke = defineRpcFunction({
  name: 'devtoolskit:internal:auth:revoke',
  type: 'action',
  jsonSerializable: true,
  setup: (context) => {
    const internal = getInternalContext(context)
    const storage = internal.storage.auth
    return {
      async handler(): Promise<{ revoked: boolean }> {
        const session = context.rpc.getCurrentRpcSession()
        const token = session?.meta.clientAuthToken
        if (!token)
          return { revoked: false }
        await revokeAuthToken(context, storage, token)
        return { revoked: true }
      },
    }
  },
})
