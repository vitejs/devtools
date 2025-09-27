import type { DevToolsDockEntry } from './views'

export interface ViteCoreRpcFunctions {
  'vite:core:list-rpc-functions': () => Promise<Record<string, {
    type: string
  }>>
  'vite:core:list-dock-entries': () => Promise<DevToolsDockEntry[]>
}

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ViteCoreRpcFunctions {}
}
