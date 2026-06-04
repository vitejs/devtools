import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { viteEnvInfo } from './functions/vite-env-info'
import { viteHmrClear } from './functions/vite-hmr-clear'
import { viteHmrUpdates } from './functions/vite-hmr-updates'
import { viteMetaInfo } from './functions/vite-meta-info'
import '@vitejs/devtools-kit'

export const rpcFunctions = [
  viteMetaInfo,
  viteEnvInfo,
  viteHmrUpdates,
  viteHmrClear,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}
}
