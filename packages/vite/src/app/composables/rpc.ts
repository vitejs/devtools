import type {} from '@vitejs/devtools'
import type { ClientRpcReturn } from '@vitejs/devtools-kit/client'
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

const rpc = shallowRef<ClientRpcReturn['rpc']>(undefined!)

export async function connect() {
  const runtimeConfig = useRuntimeConfig()
  try {
    const result = await getDevToolsRpcClient({
      baseURL: [
        '/.devtools/',
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
        onError: (e, name) => {
          connectionState.error = e
          console.error(`[vite-devtools] RPC error on executing "${name}":`)
        },
      },
    })

    rpc.value = result.rpc

    const functions = await rpc.value.$call('vite:core:list-rpc-functions')

    // TODO: add cacheable option to birpc-x and use it here
    // @ts-expect-error skip type check
    const cacheableFunctions = Object.keys(functions).filter(name => functions[name]?.cacheable)
    result.cacheManager.updateOptions({
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
