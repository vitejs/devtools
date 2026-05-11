import { getDevToolsRpcClient } from './rpc'

export * from './rpc'
export * from './rpc-streaming'

export const connectDevframe = getDevToolsRpcClient

let warnedConnectDevtool = false
/** @deprecated Use `connectDevframe`. */
export function connectDevtool(...args: Parameters<typeof getDevToolsRpcClient>): ReturnType<typeof getDevToolsRpcClient> {
  if (!warnedConnectDevtool) {
    warnedConnectDevtool = true
    console.warn('[devframe] `connectDevtool` is deprecated; use `connectDevframe` instead.')
  }
  return getDevToolsRpcClient(...args)
}
