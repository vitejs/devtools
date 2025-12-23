import type { RpcFunctionsHost, RpcSharedStateGetOptions, RpcSharedStateHost } from '@vitejs/devtools-kit'
import type { SharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { createSharedState } from '@vitejs/devtools-kit/utils/shared-state'

export function createRpcSharedStateServerHost(
  rpc: RpcFunctionsHost,
): RpcSharedStateHost {
  const sharedState = new Map<string, SharedState<any>>()

  function registerSharedState<T extends object>(key: string, state: SharedState<T>) {
    const offs: (() => void)[] = []

    offs.push(
      state.on('updated', (_fullState, patches, syncId) => {
        if (patches) {
          rpc.broadcast({
            method: 'vite:internal:rpc:client-state:patch',
            args: [key, patches, syncId],
            // TODO: filter: broadcast to clients only subscribed to its
          })
        }
        else {
          rpc.broadcast({
            method: 'vite:internal:rpc:client-state:updated',
            args: [key, syncId],
            // TODO: filter: broadcast to clients only subscribed to its
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
      if (options?.initialValue === undefined) {
        throw new Error(`Shared state of "${key}" is not found, please provide an initial value for the first time`)
      }
      const state = createSharedState<T>({
        initialState: options.initialValue,
        enablePatches: false,
      })
      registerSharedState(key, state)
      sharedState.set(key, state)
      return state
    },
  }
}
