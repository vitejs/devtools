import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { join } from 'pathe'
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
}

export const internalContextMap = new WeakMap<DevToolsNodeContext, DevToolsInternalContext>()

export function getInternalContext(context: DevToolsNodeContext): DevToolsInternalContext {
  if (!internalContextMap.has(context)) {
    const internalContext: DevToolsInternalContext = {
      storage: {
        auth: createStorage<InternalAnonymousAuthStorage>({
          filepath: join(context.workspaceRoot, 'node_modules/.vite/devtools/auth.json'),
          initialValue: {
            trusted: {},
          },
        }),
      },
    }
    internalContextMap.set(context, internalContext)
  }
  return internalContextMap.get(context)!
}
