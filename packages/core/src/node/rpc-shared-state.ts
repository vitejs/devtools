import type { RpcFunctionsHost, RpcSharedStateGetOptions, RpcSharedStateHost } from '@vitejs/devtools-kit'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { createSharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { createDebug } from 'obug'

const debug = createDebug('vite:devtools:rpc:state:changed')

export function createRpcSharedStateServerHost(
  rpc: RpcFunctionsHost,
): RpcSharedStateHost {
  const sharedState = new Map<string, SharedState<any>>()

  function registerSharedState<T extends object>(key: string, state: SharedState<T>) {
    const offs: (() => void)[] = []

    offs.push(
      state.on('updated', (fullState, patches, syncId) => {
        if (patches) {
          debug('patch', { key, syncId })
          rpc.broadcast({
            method: 'devtoolskit:internal:rpc:client-state:patch',
            args: [key, patches, syncId],
            filter: client => client.$meta.subscribedStates.has(key),
          })
        }
        else {
          debug('updated', { key, syncId })
          rpc.broadcast({
            method: 'devtoolskit:internal:rpc:client-state:updated',
            args: [key, fullState, syncId],
            filter: client => client.$meta.subscribedStates.has(key),
          })
        }
      }),
    )

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
      if (options?.initialValue === undefined && options?.sharedState === undefined) {
        throw new Error(`Shared state of "${key}" is not found, please provide an initial value for the first time`)
      }
      debug('new-state', key)
      const state = options.sharedState ?? createSharedState<T>({
        initialValue: options.initialValue as T,
        enablePatches: false,
      })
      registerSharedState(key, state)
      sharedState.set(key, state)
      return state
    },
  }
}
