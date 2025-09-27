import type { DevtoolsViewTab } from './views'

export interface ViteCoreRpcFunctions {
  'vite:core:list-rpc-functions': () => Promise<Record<string, {
    type: string
  }>>
  'vite:core:list-views': () => Promise<DevtoolsViewTab[]>
}

declare module '@vitejs/devtools-kit' {
  export interface DevtoolsRpcServerFunctions extends ViteCoreRpcFunctions {}
}
