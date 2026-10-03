import type { DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'

export type VitePluginDetails = Awaited<ReturnType<DevToolsRpcServerFunctions['vite:inspect:get-plugin-details']>>
export type VitePluginBuildInfo = VitePluginDetails['calls'][number]

export interface VitePluginItem {
  plugin_id: number
  name: string
  enforce?: 'pre' | 'post'
}
