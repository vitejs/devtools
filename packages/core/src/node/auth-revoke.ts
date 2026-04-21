import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import type { InternalAnonymousAuthStorage } from './context-internal'
import type { RpcFunctionsHost } from './host-functions'

/**
 * Flip `isTrusted` to false on any live WS clients connected with `token`
 * and broadcast the `auth:revoked` event so they can react.
 *
 * Shared between persisted-auth revocation and remote-dock token revocation.
 */
export async function revokeActiveConnectionsForToken(
  context: DevToolsNodeContext,
  token: string,
): Promise<void> {
  const rpcHost = context.rpc as unknown as RpcFunctionsHost | undefined
  if (!rpcHost?._rpcGroup)
    return

  const affectedSessionIds = new Set<string>()
  for (const client of rpcHost._rpcGroup.clients) {
    if (client.$meta.clientAuthToken === token) {
      affectedSessionIds.add(client.$meta.id)
      client.$meta.isTrusted = false
      client.$meta.clientAuthToken = undefined!
    }
  }

  if (affectedSessionIds.size === 0)
    return

  await rpcHost.broadcast({
    method: 'devtoolskit:internal:auth:revoked',
    args: [],
    filter: client => affectedSessionIds.has(client.$meta.id),
  })
}

/**
 * Revoke an auth token: remove from storage and notify all connected clients
 * using this token that they are no longer trusted.
 */
export async function revokeAuthToken(
  context: DevToolsNodeContext,
  storage: SharedState<InternalAnonymousAuthStorage>,
  token: string,
): Promise<void> {
  storage.mutate((state) => {
    delete state.trusted[token]
  })
  await revokeActiveConnectionsForToken(context, token)
}
