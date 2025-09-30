import type { BirpcReturn, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import type { Ref } from 'vue'
import { useNuxtApp } from '#app/nuxt'
import { until } from '@vueuse/core'

export function useRpc(): Ref<BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>> {
  const { $rpc } = useNuxtApp()
  return $rpc as any
}

export function useServerConnectionInfo() {
  const { $serverConnectionInfo } = useNuxtApp()
  return $serverConnectionInfo
}

export function onRpcConnected(callback: () => void) {
  const { $serverConnectionInfo } = useNuxtApp()
  until(() => $serverConnectionInfo.value.connected).toBe(true).then(callback)
}
