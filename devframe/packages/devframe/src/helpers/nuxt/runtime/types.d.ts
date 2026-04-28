import type { DevToolsRpcClient } from 'devframe/client'

declare module '#app' {
  interface NuxtApp {
    /**
     * Devframe RPC client, provided by the `devframe/helpers/nuxt`
     * module's client plugin.
     */
    $rpc: DevToolsRpcClient
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    /** Devframe RPC client (see `NuxtApp['$rpc']`). */
    $rpc: DevToolsRpcClient
  }
}

export {}
