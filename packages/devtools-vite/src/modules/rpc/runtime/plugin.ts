import type { BirpcReturn } from 'birpc'
import type { ServerFunctions } from '../../../node/rpc'
import type { ClientFunctions } from '../../../shared/types'
import { defineNuxtPlugin } from '#app'
import { useRuntimeConfig } from '#app/nuxt'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { ref } from 'vue'

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
      const runtimeConfig = useRuntimeConfig()
      try {
        const result = await getDevToolsRpcClient({
          baseURL: [
            runtimeConfig.app.baseURL,
            '/__vite_devtools__/api/',
          ],
          connectionMeta: runtimeConfig.app.connection,
          wsOptions: {
            onConnected: () => {
              serverConnectionInfo.value.connected = true
            },
            onError: (e) => {
              serverConnectionInfo.value.error = e
            },
            onDisconnected: () => {
              serverConnectionInfo.value.connected = false
            },
          },
          rpcOptions: {
            onError: (e, name) => {
              serverConnectionInfo.value.error = e
              console.error(`[vite-devtools] RPC error on executing "${name}":`)
            },
          },
        })

        rpc.value = result.rpc
      }
      catch (e) {
        serverConnectionInfo.value.error = e as Error
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
