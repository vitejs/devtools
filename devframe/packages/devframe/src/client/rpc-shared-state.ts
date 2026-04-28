import type { RpcSharedStateGetOptions, RpcSharedStateHost } from 'devframe/types'
import type { SharedState, SharedStatePatch } from 'devframe/utils/shared-state'
import type { DevToolsRpcClient } from './rpc'
import { createSharedState } from 'devframe/utils/shared-state'

export function createRpcSharedStateClientHost(rpc: DevToolsRpcClient): RpcSharedStateHost {
  const sharedState = new Map<string, SharedState<any>>()
  const initialValues = new Map<string, any>()
  const keyAddedListeners = new Set<(key: string) => void>()
  const isStaticBackend = rpc.connectionMeta.backend === 'static'

  function mergeWithInitialValue(key: string, serverState: any): any {
    const initial = initialValues.get(key)
    if (initial && typeof initial === 'object' && !Array.isArray(initial)
      && typeof serverState === 'object' && !Array.isArray(serverState)) {
      return { ...initial, ...serverState }
    }
    return serverState
  }

  rpc.client.register({
    name: 'devtoolskit:internal:rpc:client-state:updated',
    type: 'event',
    handler: (key: string, fullState: any, syncId: string) => {
      const state = sharedState.get(key)
      if (!state || state.syncIds.has(syncId))
        return
      state.mutate(() => mergeWithInitialValue(key, fullState), syncId)
    },
  })

  rpc.client.register({
    name: 'devtoolskit:internal:rpc:client-state:patch',
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
      if (isStaticBackend)
        return
      if (patches) {
        rpc.callEvent('devtoolskit:internal:rpc:server-state:patch', key, patches, syncId)
      }
      else {
        rpc.callEvent('devtoolskit:internal:rpc:server-state:set', key, fullState, syncId)
      }
    }))

    return () => {
      for (const off of offs) {
        off()
      }
    }
  }

  return {
    keys: () => Array.from(sharedState.keys()),
    onKeyAdded(fn) {
      keyAddedListeners.add(fn)
      return () => {
        keyAddedListeners.delete(fn)
      }
    },
    get: async <T extends object>(key: string, options?: RpcSharedStateGetOptions<T>) => {
      if (options?.initialValue !== undefined) {
        initialValues.set(key, options.initialValue)
      }
      if (sharedState.has(key)) {
        return sharedState.get(key)!
      }

      const state = createSharedState<T>({
        initialValue: options?.initialValue as T,
        enablePatches: false,
      })

      async function initSharedState() {
        if (!isStaticBackend) {
          rpc.callEvent('devtoolskit:internal:rpc:server-state:subscribe', key)
        }
        if (options?.initialValue !== undefined) {
          sharedState.set(key, state)
          for (const fn of keyAddedListeners)
            fn(key)
          rpc.call('devtoolskit:internal:rpc:server-state:get', key)
            .then((serverState) => {
              if (serverState !== undefined)
                state.mutate(() => mergeWithInitialValue(key, serverState))
            })
            .catch((error) => {
              console.error('Error getting server state', error)
            })
          registerSharedState(key, state)
          return state
        }
        else {
          const serverValue = await rpc.call('devtoolskit:internal:rpc:server-state:get', key) as T
          state.mutate(() => mergeWithInitialValue(key, serverValue))
          sharedState.set(key, state)
          for (const fn of keyAddedListeners)
            fn(key)
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
