import type { ConnectionMeta } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type {} from '../../node/rpc'
import { getDevToolsRpcClient, resolveDevToolsConnection } from '@vitejs/devtools-kit/client'
import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { reactive, shallowRef } from 'vue'
import { useRuntimeConfig } from '#app/nuxt'

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
    const connection = await resolveDevToolsConnection(
      [DEVTOOLS_MOUNT_PATH, runtimeConfig.app.baseURL],
      runtimeConfig.app.connection as ConnectionMeta | undefined,
    )
    rpc.value = await getDevToolsRpcClient({
      ...connection,
      cacheOptions: false,
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
          console.error(`[vite-task-devtools] RPC error on executing "${name}":`)
        },
        onFunctionError: (e, name) => {
          console.error(`[vite-task-devtools] RPC error on executing "${name}":`, e)
        },
      },
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
