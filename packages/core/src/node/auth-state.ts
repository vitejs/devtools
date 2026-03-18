import type { DevToolsNodeRpcSession } from '@vitejs/devtools-kit'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import type { InternalAnonymousAuthStorage } from './context-internal'
import { humanId } from 'human-id'

export interface PendingAuthRequest {
  clientAuthId: string
  session: DevToolsNodeRpcSession
  ua: string
  origin: string
  resolve: (result: { isTrusted: boolean }) => void
  abortController: AbortController
  timeout: ReturnType<typeof setTimeout>
}

let pendingAuth: PendingAuthRequest | null = null
let tempAuthId: string = generateTempId()

function generateTempId(): string {
  return humanId({ separator: '-', capitalize: false })
}

export function getTempAuthId(): string {
  return tempAuthId
}

export function refreshTempAuthId(): string {
  tempAuthId = generateTempId()
  return tempAuthId
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
 * Returns the client's authId if successful, null otherwise.
 */
export function consumeTempAuthId(
  id: string,
  storage: SharedState<InternalAnonymousAuthStorage>,
): string | null {
  if (id !== tempAuthId || !pendingAuth) {
    return null
  }

  const { clientAuthId, session, ua, origin, resolve } = pendingAuth

  // Trust the pending client
  storage.mutate((state) => {
    state.trusted[clientAuthId] = {
      authId: clientAuthId,
      ua,
      origin,
      timestamp: Date.now(),
    }
  })
  session.meta.clientAuthId = clientAuthId
  session.meta.isTrusted = true

  // Resolve the pending auth RPC call
  resolve({ isTrusted: true })

  // Abort terminal prompt and clean up
  abortPendingAuth()

  // Generate a new temp ID for next use
  refreshTempAuthId()

  return clientAuthId
}
