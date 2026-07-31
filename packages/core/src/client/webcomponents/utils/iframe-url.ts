import type { DevToolsRpcClient, DocksContext } from '@vitejs/devtools-kit/client'

const ABSOLUTE_URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i

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

export function resolveDockIframeUrl(url: string, baseOrigin = getWindowOrigin()): string {
  const value = url.trim()
  if (!value)
    return value

  if (ABSOLUTE_URL_RE.test(value))
    return value

  if (value.startsWith('/')) {
    if (!baseOrigin)
      return value

    try {
      return new URL(value, baseOrigin).href
    }
    catch {
      return value
    }
  }

  return `http://${value}`
}
