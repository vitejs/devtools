import type { DevToolsRpcSharedStates, RpcFunctionsHost, RpcSharedStateGetOptions, RpcSharedStateHost } from 'devframe/types'
import type { SharedState, SharedStatePatch } from 'devframe/utils/shared-state'
import { createSharedState } from 'devframe/utils/shared-state'
import { createDebug } from 'obug'
import { logger } from './diagnostics'

const debug = createDebug('vite:devtools:rpc:state:changed')
const debugSubscribe = createDebug('vite:devtools:rpc:state:subscribe')

export function createRpcSharedStateServerHost(
  rpc: RpcFunctionsHost,
): RpcSharedStateHost {
  const sharedState = new Map<string, SharedState<any>>()
  const keyAddedListeners = new Set<(key: string) => void>()

  function registerSharedState<T extends object>(key: string, state: SharedState<T>) {
    const offs: (() => void)[] = []

    offs.push(
      state.on('updated', (fullState, patches, syncId) => {
        if (patches) {
          debug('patch', { key, syncId })
          rpc.broadcast({
            method: 'devframe:rpc:client-state:patch',
            args: [key, patches, syncId],
            filter: client => client.$meta.subscribedStates.has(key),
          })
        }
        else {
          debug('updated', { key, syncId })
          rpc.broadcast({
            method: 'devframe:rpc:client-state:updated',
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
        throw logger.DF0013({ key }).throw()
      }
      debug('new-state', key)
      const state = options.sharedState ?? createSharedState<T>({
        initialValue: options.initialValue as T,
        enablePatches: false,
      })
      registerSharedState(key, state)
      sharedState.set(key, state)
      for (const fn of keyAddedListeners)
        fn(key)
      return state
    },
    keys() {
      return Array.from(sharedState.keys())
    },
    onKeyAdded(fn) {
      keyAddedListeners.add(fn)
      return () => {
        keyAddedListeners.delete(fn)
      }
    },
  }

  // Wire methods that the client-side `client/rpc-shared-state.ts`
  // calls to subscribe / get / push patches / push full snapshots.
  // Registering them here keeps shared-state self-contained: any
  // server built on `RpcFunctionsHost` (devframe standalone or kit /
  // core) gets the full sync protocol out of the box.
  rpc.register({
    name: 'devframe:rpc:server-state:subscribe',
    type: 'event',
    handler(key: string) {
      const session = rpc.getCurrentRpcSession()
      if (!session)
        return
      debugSubscribe('subscribe', { key, session: session.meta.id })
      session.meta.subscribedStates.add(key)
    },
  })

  rpc.register({
    name: 'devframe:rpc:server-state:get',
    type: 'query',
    handler: async (key: string) => {
      if (!sharedState.has(key))
        return undefined
      const state = await host.get(key as keyof DevToolsRpcSharedStates)
      return state.value()
    },
    // Pre-compute snapshots for the build-mode static dump so the SPA
    // can read them without a live server.
    dump: () => ({
      inputs: host.keys().map(key => [key] as [string]),
    }),
  })

  rpc.register({
    name: 'devframe:rpc:server-state:set',
    type: 'query',
    handler: async (key: string, value: any, syncId: string) => {
      const state = await host.get(key as keyof DevToolsRpcSharedStates, {
        initialValue: value,
      })
      state.mutate(() => value, syncId)
    },
  })

  rpc.register({
    name: 'devframe:rpc:server-state:patch',
    type: 'query',
    handler: async (key: string, patches: SharedStatePatch[], syncId: string) => {
      if (!sharedState.has(key))
        return
      const state = await host.get(key as keyof DevToolsRpcSharedStates)
      state.patch(patches, syncId)
    },
  })

  return host
}
