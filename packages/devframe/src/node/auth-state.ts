import type { DevToolsNodeRpcSession } from 'devframe/types'
import type { SharedState } from 'devframe/utils/shared-state'
import type { InternalAnonymousAuthStorage } from './context-internal'
import { humanId } from 'devframe/utils/human-id'

export interface PendingAuthRequest {
  clientAuthToken: string
  session: DevToolsNodeRpcSession
  ua: string
  origin: string
  resolve: (result: { isTrusted: boolean }) => void
  abortController: AbortController
  timeout: ReturnType<typeof setTimeout>
}

let pendingAuth: PendingAuthRequest | null = null
let tempAuthToken: string = generateTempId()

function generateTempId(): string {
  return humanId({ separator: '-', capitalize: false })
}

export function getTempAuthToken(): string {
  return tempAuthToken
}

export function refreshTempAuthToken(): string {
  tempAuthToken = generateTempId()
  return tempAuthToken
}

export function getPendingAuth(): PendingAuthRequest | null {
  return pendingAuth
}

export function setPendingAuth(request: PendingAuthRequest | null): void {
  pendingAuth = request
}

/**
 * Abort and clean up any existing pending auth request.
 */
export function abortPendingAuth(): void {
  if (pendingAuth) {
    pendingAuth.abortController.abort()
    clearTimeout(pendingAuth.timeout)
    pendingAuth = null
  }
}

/**
 * Consume the temp auth ID: verify it matches, trust the pending client, and clean up.
 * Returns the client's authToken if successful, null otherwise.
 */
export function consumeTempAuthToken(
  id: string,
  storage: SharedState<InternalAnonymousAuthStorage>,
): string | null {
  if (id !== tempAuthToken || !pendingAuth) {
    return null
  }

  const { clientAuthToken, session, ua, origin, resolve } = pendingAuth

  // Trust the pending client
  storage.mutate((state) => {
    state.trusted[clientAuthToken] = {
      authToken: clientAuthToken,
      ua,
      origin,
      timestamp: Date.now(),
    }
  })
  session.meta.clientAuthToken = clientAuthToken
  session.meta.isTrusted = true

  // Resolve the pending auth RPC call
  resolve({ isTrusted: true })

  // Abort terminal prompt and clean up
  abortPendingAuth()

  // Generate a new temp ID for next use
  refreshTempAuthToken()

  return clientAuthToken
}
