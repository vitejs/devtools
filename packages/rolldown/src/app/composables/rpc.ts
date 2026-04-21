import type {} from '@vitejs/devtools'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type {} from '../../node/rpc'
import { useRuntimeConfig } from '#app/nuxt'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { reactive, shallowRef } from 'vue'

export const connectionState = reactive<{
  connected: boolean
  error: Error | null
}>({
  connected: false,
  error: null,
})

const rpc = shallowRef<DevToolsRpcClient>(undefined!)

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
          connectionState.connected = true
        },
        onError: (e) => {
          connectionState.error = e
        },
        onDisconnected: () => {
          connectionState.connected = false
        },
      },
      rpcOptions: {
        onGeneralError: (e, name) => {
          connectionState.error = e
          console.error(`[rolldown-devtools] RPC error on executing "${name}":`)
        },
        onFunctionError: (e, name) => {
          connectionState.error = e
          console.error(`[rolldown-devtools] RPC error on executing "${name}":`)
        },
      },
    })

    const functions = await rpc.value.call('devtoolskit:internal:rpc:server:list')
    const cacheableFunctions = Object.keys(functions).filter(name => functions[name]?.cacheable)

    rpc.value.cacheManager.updateOptions({
      functions: [...cacheableFunctions],
    })

    connectionState.connected = true
  }
  catch (e) {
    connectionState.error = e as Error
  }
}

export function useRpc() {
  return rpc
}
