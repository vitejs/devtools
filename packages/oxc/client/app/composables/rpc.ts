import type {} from '@vitejs/devtools'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type {} from '../../../src/node/rpc'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
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
    rpc.value = await getDevToolsRpcClient({
      // Embedded in Vite DevTools the connection meta is injected via
      // `runtimeConfig.app.connection`; standalone (devframe CLI) it is fetched
      // from `<base>__connection.json`, so both mount paths are candidates.
      baseURL: [DEVTOOLS_MOUNT_PATH, runtimeConfig.app.baseURL],
      cacheOptions: true,
      connectionMeta: runtimeConfig.app.connection,
      wsOptions: {
        onConnected: () => {
          connectionState.connected = true
        },
        onError: e => {
          connectionState.error = e
        },
        onDisconnected: () => {
          connectionState.connected = false
        },
      },
      rpcOptions: {
        onGeneralError: (e, name) => {
          connectionState.error = e
          console.error(`[devtools-oxc] RPC error on executing "${name}":`)
        },
        onFunctionError: (e, name) => {
          connectionState.error = e
          console.error(`[devtools-oxc] RPC error on executing "${name}":`)
        },
      },
    })

    // Cache auto-discovery. Only available when embedded in Vite DevTools (core
    // registers `devtoolskit:internal:rpc:server:list`); standalone devframe
    // has no such function, so skip caching gracefully rather than fail the
    // whole connection.
    try {
      const functions = await rpc.value.call('devtoolskit:internal:rpc:server:list')
      const cacheableFunctions = Object.keys(functions).filter(name => functions[name]?.cacheable)
      rpc.value.cacheManager.updateOptions({
        functions: [...cacheableFunctions],
      })
    } catch {}

    connectionState.connected = true
  } catch (e) {
    connectionState.error = e as Error
  }
}

export function useRpc() {
  return rpc
}
