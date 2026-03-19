import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { RpcFunctionsHost } from './host-functions'
import { getInternalContext } from './context-internal'

/**
 * Revoke an auth token: remove from storage and notify all connected clients
 * using this token that they are no longer trusted.
 */
export async function revokeAuthToken(context: DevToolsNodeContext, token: string): Promise<void> {
  const internal = getInternalContext(context)
  const storage = internal.storage.auth

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
