import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { revokeAuthToken } from './auth-revoke'
import { createStorage } from './storage'

export interface InternalAnonymousAuthStorage {
  trusted: Record<string, {
    authId: string
    ua: string
    origin: string
    timestamp: number
  }>
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
    const internalContext: DevToolsInternalContext = {
      storage: {
        auth: storage,
      },
      revokeAuthToken: (token: string) => revokeAuthToken(context, storage, token),
    }
    internalContextMap.set(context, internalContext)
  }
  return internalContextMap.get(context)!
}
