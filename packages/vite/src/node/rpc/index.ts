import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { viteClearModuleTransform } from './functions/vite-clear-module-transform'
import { viteEnvInfo } from './functions/vite-env-info'
import { viteGetMetadata } from './functions/vite-get-metadata'
import { viteGetModuleTransformInfo } from './functions/vite-get-module-transform-info'
import { viteGetModulesList } from './functions/vite-get-modules-list'
import { viteGetPluginDetails } from './functions/vite-get-plugin-details'
import { viteGetPluginMetrics } from './functions/vite-get-plugin-metrics'
import { viteGetServerMetrics } from './functions/vite-get-server-metrics'
import { viteMetaInfo } from './functions/vite-meta-info'
import { viteResolveId } from './functions/vite-resolve-id'
import '@vitejs/devtools-kit'

export const VITE_INSPECT_MODULE_UPDATED_STATE_KEY = 'vite:inspect:module-updated'

export interface ViteInspectModuleUpdatedState {
  version: number
  ids: string[] | null
  updatedAt: number
}

export const viteRpcFunctions = [
  viteMetaInfo,
  viteEnvInfo,
] as const

export const inspectRpcFunctions = [
  viteClearModuleTransform,
  viteGetMetadata,
  viteGetModulesList,
  viteGetPluginMetrics,
  viteGetPluginDetails,
  viteGetModuleTransformInfo,
  viteResolveId,
  viteGetServerMetrics,
] as const

export const rpcFunctions = [
  ...viteRpcFunctions,
  ...inspectRpcFunctions,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

// devframe ≥0.7.4: augment the canonical `devframe/types` module directly
// (renamed re-exports like the kit's `DevTools*` alias no longer merge).
declare module 'devframe/types' {
  interface DevframeRpcServerFunctions extends ServerFunctions {}

  interface DevframeRpcSharedStates {
    'vite:inspect:module-updated': ViteInspectModuleUpdatedState
  }
}
