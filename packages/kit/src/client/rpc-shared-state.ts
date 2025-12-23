import type { RpcSharedStateGetOptions, RpcSharedStateHost } from '../types'
import type { SharedState } from '../utils/shared-state'
import type { DevToolsRpcClient } from './rpc'
import { createSharedState } from '../utils/shared-state'

export function createRpcSharedStateClientHost(rpc: DevToolsRpcClient): RpcSharedStateHost {
  const sharedState = new Map<string, SharedState<any>>()

  rpc.client.register({
    name: 'vite:internal:rpc:client-state:updated',
    type: 'event',
    handler: async (key: string, syncId: string) => {
      const state = sharedState.get(key)
      if (!state || state.syncIds.has(syncId))
        return
      const newState = await rpc.call('vite:internal:rpc:server-state:get', key)
      state.mutate(() => newState, syncId)
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
      if (options?.initialValue !== undefined) {
        const state = createSharedState<T>({
          initialState: options.initialValue,
          enablePatches: false,
        })
        sharedState.set(key, state)
        registerSharedState(key, state)
        return state
      }
      else {
        const initialState = await rpc.call('vite:internal:rpc:server-state:get', key) as T
        const state = createSharedState<T>({
          initialState,
          enablePatches: false,
        })
        sharedState.set(key, state)
        registerSharedState(key, state)
        return state
      }
    },
  }
}
