import { useNuxtApp } from '#app/nuxt'
import { until } from '@vueuse/core'

export function useRpc() {
  const { $rpc } = useNuxtApp()
  return $rpc
}

export function useServerConnectionInfo() {
  const { $serverConnectionInfo } = useNuxtApp()
  return $serverConnectionInfo
}

export function onRpcConnected(callback: () => void) {
  const { $serverConnectionInfo } = useNuxtApp()
  until(() => $serverConnectionInfo.value.connected).toBe(true).then(callback)
}
