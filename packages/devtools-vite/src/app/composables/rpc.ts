import type {} from '@vitejs/devtools'
import type { BirpcReturn, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import type {} from '../../node/rpc'
import { useRuntimeConfig } from '#app/nuxt'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { reactive, shallowRef } from 'vue'

export const connectionState = reactive<{
  connected: boolean
  error: Error | null
}>({
  connected: false,
  error: null,
})

const rpc = shallowRef<BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>>(undefined!)

export async function connect() {
  const runtimeConfig = useRuntimeConfig()
  try {
    const result = await getDevToolsRpcClient({
      baseURL: [
        '/.devtools/',
        runtimeConfig.app.baseURL,
      ],
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
        onError: (e, name) => {
          connectionState.error = e
          console.error(`[vite-devtools] RPC error on executing "${name}":`)
        },
      },
    })

    rpc.value = result.rpc
    connectionState.connected = true
  }
  catch (e) {
    connectionState.error = e as Error
  }
}

export function useRpc() {
  return rpc
}
