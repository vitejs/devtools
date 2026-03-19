import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import type { InternalAnonymousAuthStorage } from './context-internal'
import type { RpcFunctionsHost } from './host-functions'

/**
 * Revoke an auth token: remove from storage and notify all connected clients
 * using this token that they are no longer trusted.
 */
export async function revokeAuthToken(
  context: DevToolsNodeContext,
  storage: SharedState<InternalAnonymousAuthStorage>,
  token: string,
): Promise<void> {
  // Remove from persistent storage
  storage.mutate((state) => {
    delete state.trusted[token]
  })

  const rpcHost = context.rpc as unknown as RpcFunctionsHost
  if (!rpcHost._rpcGroup)
    return

  // Collect affected session IDs before modifying meta
  const affectedSessionIds = new Set<string>()
  for (const client of rpcHost._rpcGroup.clients) {
    if (client.$meta.clientAuthId === token) {
      affectedSessionIds.add(client.$meta.id)
      client.$meta.isTrusted = false
      client.$meta.clientAuthId = undefined!
    }
  }

  if (affectedSessionIds.size === 0)
    return

  // Notify affected clients
  await rpcHost.broadcast({
    method: 'devtoolskit:internal:auth:revoked',
    args: [],
    filter: client => affectedSessionIds.has(client.$meta.id),
  })
}
