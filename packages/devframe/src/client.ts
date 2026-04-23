// Backend-detecting RPC client for devframe-built UIs. For now this is
// a thin re-export of Kit's `getDevToolsRpcClient`, which already has
// websocket + static auto-detection. The plan's `connectDevtool` name
// stabilises here as the public entry.
export { getDevToolsRpcClient as connectDevtool } from '@vitejs/devtools-kit/client'
export type { DevToolsRpcClient, DevToolsRpcClientOptions } from '@vitejs/devtools-kit/client'
