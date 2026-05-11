import type { DevToolsRpcClient } from 'devframe/client'
// `#app` is a Nuxt virtual module; types resolve via `@nuxt/schema`.
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { connectDevframe } from 'devframe/client'

/**
 * Nuxt client plugin that calls `connectDevframe()` once on the client
 * and provides the RPC client as `$rpc` / `useNuxtApp().$rpc`.
 */
export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const baseURL = (config.public as any)?.devframe?.baseURL ?? './'
  const rpc = await connectDevframe({ baseURL })
  return {
    provide: {
      rpc: rpc as DevToolsRpcClient,
    },
  }
})
