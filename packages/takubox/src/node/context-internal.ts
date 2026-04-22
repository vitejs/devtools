import type { DevToolsNodeContext } from 'takubox/types'
import type { SharedState } from 'takubox/utils/shared-state'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { humanId } from 'takubox/utils/human-id'
import { revokeActiveConnectionsForToken, revokeAuthToken } from './auth-revoke'
import { createStorage } from './storage'

export interface InternalAnonymousAuthStorage {
  trusted: Record<string, {
    authToken: string
    ua: string
    origin: string
    timestamp: number
  } | undefined>
}

export interface RemoteTokenRecord {
  dockId: string
  /** Dock URL origin — matched against WS handshake `Origin` header when `originLock` is on. */
  origin: string
  originLock: boolean
}

export interface DevToolsInternalContext {
  storage: {
    auth: SharedState<InternalAnonymousAuthStorage>
  }
  /**
   * Revoke an auth token: remove from storage and notify all connected clients
   * using this token that they are no longer trusted.
   */
  revokeAuthToken: (token: string) => Promise<void>

  /**
   * Session-only tokens issued to remote-UI iframe docks. Not persisted —
   * regenerated on every dev-server restart.
   */
  remoteTokens: Map<string, RemoteTokenRecord>
  allocateRemoteToken: (dockId: string, origin: string, originLock: boolean) => string
  revokeRemoteToken: (token: string) => void
  revokeRemoteTokensForDock: (dockId: string) => void
  /**
   * Returns true if `token` is a valid remote token and, when `originLock` is
   * on, `requestOrigin` matches the recorded dock origin.
   */
  isRemoteTokenTrusted: (token: string, requestOrigin?: string) => boolean

  /**
   * Populated by `createWsServer` once the WS port is bound. Consumed by the
   * docks host when enriching remote iframe URLs with a connection descriptor.
   */
  wsEndpoint?: {
    /** Full `ws://` or `wss://` URL with host and port. */
    url: string
  }
}

export const internalContextMap = new WeakMap<DevToolsNodeContext, DevToolsInternalContext>()

export function getInternalContext(context: DevToolsNodeContext): DevToolsInternalContext {
  if (!internalContextMap.has(context)) {
    const storage = createStorage<InternalAnonymousAuthStorage>({
      filepath: join(homedir(), '.vite/devtools/auth.json'),
      initialValue: {
        trusted: {},
      },
    })
    const remoteTokens = new Map<string, RemoteTokenRecord>()

    function revokeRemoteToken(token: string): void {
      if (!remoteTokens.delete(token))
        return
      void revokeActiveConnectionsForToken(context, token)
    }

    const internalContext: DevToolsInternalContext = {
      storage: {
        auth: storage,
      },
      revokeAuthToken: (token: string) => revokeAuthToken(context, storage, token),
      remoteTokens,
      allocateRemoteToken(dockId, origin, originLock) {
        const token = humanId({ separator: '-', capitalize: false })
        remoteTokens.set(token, { dockId, origin, originLock })
        return token
      },
      revokeRemoteToken,
      revokeRemoteTokensForDock(dockId) {
        const tokensToRevoke: string[] = []
        for (const [token, record] of remoteTokens) {
          if (record.dockId === dockId)
            tokensToRevoke.push(token)
        }
        for (const token of tokensToRevoke)
          revokeRemoteToken(token)
      },
      isRemoteTokenTrusted(token, requestOrigin) {
        const record = remoteTokens.get(token)
        if (!record)
          return false
        if (!record.originLock)
          return true
        return !!requestOrigin && record.origin === requestOrigin
      },
    }
    internalContextMap.set(context, internalContext)
  }
  return internalContextMap.get(context)!
}
