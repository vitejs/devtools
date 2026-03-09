import type {} from '@vitejs/devtools'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type {} from '../../node/rpc'
import { useRuntimeConfig } from '#app/nuxt'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { reactive, shallowRef } from 'vue'

export const rpcConnectionState = reactive<{
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
        '/.devtools/',
        runtimeConfig.app.baseURL,
      ],
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

    rpcConnectionState.connected = true
  }
  catch (e) {
    rpcConnectionState.error = e as Error
  }
}

export function useRpc() {
  return rpc
}
