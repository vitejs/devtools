import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { viteHi } from './functions/hi'
import '@vitejs/devtools-kit'

export const rpcFunctions = [
  viteHi,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}
}
