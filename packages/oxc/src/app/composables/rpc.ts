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

const CONNECTION_META_FILENAME = '__connection.json'

/**
 * Resolve the devframe connection descriptor across candidate mount paths.
 *
 * `getDevToolsRpcClient` fetches `<base>__connection.json` without checking the
 * HTTP status, so a 404 JSON body (e.g. hitting the kit mount path `/__devtools/`
 * while running standalone) would be accepted as bogus meta. We probe the
 * candidates ourselves with an `res.ok` guard and report which base actually
 * served it, so the WS endpoint resolves against the right origin.
 */
async function resolveConnection(bases: string[]) {
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${CONNECTION_META_FILENAME}`)
      if (!res.ok) continue
      return { connectionMeta: await res.json(), base }
    } catch {}
  }
  return undefined
}

export async function connect() {
  const runtimeConfig = useRuntimeConfig()
  try {
    // Embedded in Vite DevTools the connection meta is injected via
    // `runtimeConfig.app.connection` (served by core at the kit mount path);
    // standalone (devframe CLI) it is served from the app's own base. Probe
    // both, keeping the base that answered first so the WS URL resolves there.
    let bases = [DEVTOOLS_MOUNT_PATH, runtimeConfig.app.baseURL]
    let connectionMeta = runtimeConfig.app.connection
    if (!connectionMeta) {
      const resolved = await resolveConnection(bases)
      if (resolved) {
        connectionMeta = resolved.connectionMeta
        bases = [resolved.base, ...bases.filter(base => base !== resolved.base)]
      }
    }

    rpc.value = await getDevToolsRpcClient({
      baseURL: bases,
      cacheOptions: true,
      connectionMeta,
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
    connectionState.connected = true
  } catch (e) {
    connectionState.error = e as Error
  }
}

export function useRpc() {
  return rpc
}
