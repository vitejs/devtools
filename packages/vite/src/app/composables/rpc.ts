import type {} from '@vitejs/devtools'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type { ViteInspectModuleUpdatedState } from '../../node/rpc'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { createEventEmitter } from '@vitejs/devtools-kit/utils/events'
import { getCurrentScope, onScopeDispose, reactive, shallowRef } from 'vue'
import { useRuntimeConfig } from '#app/nuxt'

export interface InspectModuleUpdatedPayload {
  ids?: string[]
}

export const rpcConnectionState = reactive<{
  connected: boolean
  error: Error | null
}>({
  connected: false,
  error: null,
})

const rpc = shallowRef<DevToolsRpcClient>(undefined!)
const moduleUpdated = createEventEmitter<{
  updated: (payload: InspectModuleUpdatedPayload) => void
}>()
let unsubscribeInspectModuleUpdates: (() => void) | undefined

function triggerModuleUpdated(payload: InspectModuleUpdatedPayload = {}) {
  moduleUpdated.emit('updated', payload)
}

async function subscribeInspectModuleUpdates(client: DevToolsRpcClient) {
  unsubscribeInspectModuleUpdates?.()

  const state = await client.sharedState.get('vite:inspect:module-updated', {
    initialValue: {
      ids: null,
      updatedAt: 0,
    },
  })

  unsubscribeInspectModuleUpdates = state.on('updated', (value: ViteInspectModuleUpdatedState) => {
    client.cacheManager.clear()

    triggerModuleUpdated({
      ids: value.ids ?? undefined,
    })
  })
}

export async function connect() {
  const runtimeConfig = useRuntimeConfig()
  try {
    rpc.value = await getDevToolsRpcClient({
      baseURL: [
        DEVTOOLS_MOUNT_PATH,
        runtimeConfig.app.baseURL,
      ],
      cacheOptions: true,
      connectionMeta: runtimeConfig.app.connection,
      wsOptions: {
        onConnected: () => {
          rpcConnectionState.connected = true
        },
        onError: (e) => {
          rpcConnectionState.error = e
        },
        onDisconnected: () => {
          rpcConnectionState.connected = false
        },
      },
      rpcOptions: {
        onGeneralError: (e, name) => {
          rpcConnectionState.error = e
          console.error(`[vite-devtools] RPC error on executing "${name}":`)
        },
        onFunctionError: (e, name) => {
          rpcConnectionState.error = e
          console.error(`[vite-devtools] RPC error on executing "${name}":`)
        },
      },
    })
    await subscribeInspectModuleUpdates(rpc.value)

    const functions = await rpc.value.call('devtoolskit:internal:rpc:server:list')
    rpc.value.cacheManager.updateOptions({
      functions: Object.keys(functions).filter(name => functions[name]?.cacheable),
    })

    rpcConnectionState.connected = true
  }
  catch (e) {
    rpcConnectionState.error = e as Error
  }
}

export function useRpc() {
  return rpc
}

export function onInspectModuleUpdated(handler: (payload: InspectModuleUpdatedPayload) => void | Promise<void>) {
  const off = moduleUpdated.on('updated', handler)

  if (getCurrentScope())
    onScopeDispose(off)

  return off
}
