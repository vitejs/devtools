import type { DevToolsRpcClient, DocksContext } from '@vitejs/devtools-kit/client'

export function getWindowOrigin(): string {
  try {
    return window.location.origin
  }
  catch {
    return ''
  }
}

export function getRpcConnectionOrigin(rpc: DevToolsRpcClient): string {
  const baseUrl = rpc.connection?.metaBaseUrl
    ?? rpc.connectionMeta?.baseUrl
  if (baseUrl) {
    try {
      return new URL(baseUrl).origin
    }
    catch {}
  }
  return getWindowOrigin()
}

export function getDocksContextOrigin(context: DocksContext): string {
  return getRpcConnectionOrigin(context.rpc)
}
