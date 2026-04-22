import type { RpcFunctionsHost, RpcSharedStateGetOptions, RpcSharedStateHost } from 'takubox/types'
import type { SharedState } from 'takubox/utils/shared-state'
import { createDebug } from 'obug'
import { createSharedState } from 'takubox/utils/shared-state'
import { logger } from './diagnostics'

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

  const host: RpcSharedStateHost = {
    get: async <T extends object>(key: string, options?: RpcSharedStateGetOptions<T>) => {
      if (sharedState.has(key)) {
        return sharedState.get(key)!
      }
      if (options?.initialValue === undefined && options?.sharedState === undefined) {
        throw logger.TKB0013({ key }).throw()
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
    keys() {
      return Array.from(sharedState.keys())
    },
  }

  return host
}
