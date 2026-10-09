import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import '@vitejs/devtools-kit'

export const rpcFunctions = [] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

declare module 'devframe/types' {
  interface DevframeRpcServerFunctions extends ServerFunctions {}
}
