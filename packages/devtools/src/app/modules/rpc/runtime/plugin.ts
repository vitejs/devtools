import type { BirpcReturn } from 'birpc'
import type { ServerFunctions } from '../../../../node/rpc'
import type { ClientFunctions } from '../../../../shared/types'
import { defineNuxtPlugin } from '#app'
import { useRuntimeConfig } from '#app/nuxt'
import { createRpcClient as _createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'
import { ref } from 'vue'

export interface ConnectionMeta {
  backend: 'websocket' | 'static'
  websocket?: number
}
async function getMetadata() {
  const config = useRuntimeConfig()
  const baseURL = config.app.baseURL
  const metadata: ConnectionMeta = await fetch(`${baseURL}api/metadata.json`)
    .then(r => r.json())

  return metadata
}

export default defineNuxtPlugin({
  name: 'devtools-rpc',
  setup() {
    const serverConnectionInfo = ref<{
      connected: boolean
      error: Error | null
    }>({
      connected: false,
      error: null,
    })

    const rpc = ref<BirpcReturn<ServerFunctions, ClientFunctions>>()

    async function connectToServer() {
      const metadata = await getMetadata()
      if (metadata.backend === 'static') {
      // TODO: static server
      }
      else {
        const url = `${location.protocol.replace('http', 'ws')}//${location.hostname}:${metadata.websocket}`
        const clientFunctions = {} as ClientFunctions

        try {
          const preset = createWsRpcPreset({
            url,
            onConnected: () => {
              serverConnectionInfo.value.connected = true
            },
            onError: (e) => {
              serverConnectionInfo.value.error = e
            },
            onDisconnected: () => {
              serverConnectionInfo.value.connected = false
            },
          })

          rpc.value = _createRpcClient<ServerFunctions, ClientFunctions>(clientFunctions, {
            preset,
            rpcOptions: {
              onError: (e, name) => {
                serverConnectionInfo.value.error = e
                console.error(`[vite-devtools] RPC error on executing "${name}":`)
              },
            },
          })
        }
        catch (e) {
          serverConnectionInfo.value.error = e as Error
        }
      }
    }

    return {
      provide: {
        connectToServer,
        serverConnectionInfo,
        rpc,
      },
    }
  },
})
