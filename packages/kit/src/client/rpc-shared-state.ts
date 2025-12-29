import type { RpcSharedStateGetOptions, RpcSharedStateHost } from '../types'
import type { SharedState, SharedStatePatch } from '../utils/shared-state'
import type { DevToolsRpcClient } from './rpc'
import { createSharedState } from '../utils/shared-state'

export function createRpcSharedStateClientHost(rpc: DevToolsRpcClient): RpcSharedStateHost {
  const sharedState = new Map<string, SharedState<any>>()

  rpc.client.register({
    name: 'vite:internal:rpc:client-state:updated',
    type: 'event',
    handler: (key: string, fullState: any, syncId: string) => {
      const state = sharedState.get(key)
      if (!state || state.syncIds.has(syncId))
        return
      state.mutate(() => fullState, syncId)
    },
  })

  rpc.client.register({
    name: 'vite:internal:rpc:client-state:patch',
    type: 'event',
    handler: (key: string, patches: SharedStatePatch[], syncId: string) => {
      const state = sharedState.get(key)
      if (!state || state.syncIds.has(syncId))
        return
      state.patch(patches, syncId)
    },
  })

  function registerSharedState<T extends object>(key: string, state: SharedState<T>) {
    const offs: (() => void)[] = []
    offs.push(state.on('updated', (fullState, patches, syncId) => {
      if (patches) {
        rpc.callEvent('vite:internal:rpc:server-state:patch', key, patches, syncId)
      }
      else {
        rpc.callEvent('vite:internal:rpc:server-state:set', key, fullState, syncId)
      }
    }))

    return () => {
      for (const off of offs) {
        off()
      }
    }
  }

  return {
    get: async <T extends object>(key: string, options?: RpcSharedStateGetOptions<T>) => {
      if (sharedState.has(key)) {
        return sharedState.get(key)!
      }

      const state = createSharedState<T>({
        initialValue: options?.initialValue as T,
        enablePatches: false,
      })

      async function initSharedState() {
        rpc.callEvent('vite:internal:rpc:server-state:subscribe', key)
        if (options?.initialValue !== undefined) {
          sharedState.set(key, state)
          rpc.call('vite:internal:rpc:server-state:get', key)
            .then((serverState) => {
              state.mutate(() => serverState)
            })
            .catch((error) => {
              console.error('Error getting server state', error)
            })
          registerSharedState(key, state)
          return state
        }
        else {
          const initialValue = await rpc.call('vite:internal:rpc:server-state:get', key) as T
          state.mutate(() => initialValue)
          sharedState.set(key, state)
          registerSharedState(key, state)
          return state
        }
      }

      return new Promise<SharedState<T>>((resolve) => {
        if (!rpc.isTrusted) {
          resolve(state)
          rpc.events.on('rpc:is-trusted:updated', (isTrusted) => {
            if (isTrusted) {
              initSharedState()
            }
          })
        }
        else {
          initSharedState().then(resolve)
        }
      })
    },
  }
}
