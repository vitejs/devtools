import type { ConnectionMeta } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type {} from '../../node/rpc'
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

async function resolveConnection(bases: string[]) {
  for (const base of bases) {
    try {
      const res = await fetch(`${base}__connection.json`)
      if (!res.ok)
        continue
      return { connectionMeta: await res.json() as ConnectionMeta, base }
    }
    catch {}
  }
}

export async function connect() {
  const runtimeConfig = useRuntimeConfig()
  try {
    let bases = [DEVTOOLS_MOUNT_PATH, runtimeConfig.app.baseURL]
    let connectionMeta = runtimeConfig.app.connection as ConnectionMeta | undefined
    if (!connectionMeta) {
      const resolved = await resolveConnection(bases)
      if (resolved) {
        connectionMeta = resolved.connectionMeta
        bases = [resolved.base, ...bases.filter(base => base !== resolved.base)]
      }
    }

    rpc.value = await getDevToolsRpcClient({
      baseURL: bases,
      cacheOptions: false,
      connectionMeta,
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
