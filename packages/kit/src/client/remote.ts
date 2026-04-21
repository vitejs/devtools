import type { RemoteConnectionInfo } from '../types'
import type { DevToolsRpcClient, DevToolsRpcClientOptions } from './rpc'
import { REMOTE_CONNECTION_KEY } from '../constants'
import { getDevToolsRpcClient } from './rpc'

export type ConnectRemoteDevToolsOptions = Omit<DevToolsRpcClientOptions, 'connectionMeta' | 'authToken'>

function base64UrlDecode(value: string): string {
  const padLen = (4 - value.length % 4) % 4
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function extractKeyFromFragment(hash: string): string | null {
  if (!hash)
    return null
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  for (const part of raw.split('&')) {
    const [k, v = ''] = part.split('=')
    if (k === REMOTE_CONNECTION_KEY)
      return decodeURIComponent(v)
  }
  return null
}

function extractKeyFromQuery(search: string): string | null {
  if (!search)
    return null
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return params.get(REMOTE_CONNECTION_KEY)
}

/**
 * Parse a {@link RemoteConnectionInfo} descriptor from the current page's URL
 * (or a provided URL/string). Checks the URL fragment first, then the query.
 *
 * Returns `null` if no descriptor is present.
 * Throws if the descriptor is malformed or its schema version is unsupported.
 */
export function parseRemoteConnection(input?: string): RemoteConnectionInfo | null {
  let hash = ''
  let search = ''
  if (input === undefined) {
    if (typeof location === 'undefined')
      return null
    hash = location.hash
    search = location.search
  }
  else {
    try {
      const parsed = new URL(input, 'http://_')
      hash = parsed.hash
      search = parsed.search
    }
    catch {
      // Treat as raw fragment or query string.
      if (input.startsWith('#'))
        hash = input
      else if (input.startsWith('?'))
        search = input
      else
        return null
    }
  }

  const encoded = extractKeyFromFragment(hash) ?? extractKeyFromQuery(search)
  if (!encoded)
    return null

  let payload: unknown
  try {
    payload = JSON.parse(base64UrlDecode(encoded))
  }
  catch (cause) {
    throw new Error('[vite-devtools-kit] Failed to decode remote connection descriptor.', { cause })
  }

  if (!payload || typeof payload !== 'object')
    throw new Error('[vite-devtools-kit] Remote connection descriptor must be an object.')

  const info = payload as Partial<RemoteConnectionInfo>
  if (info.v !== 1)
    throw new Error(`[vite-devtools-kit] Unsupported remote connection descriptor version: ${String(info.v)}`)
  if (info.backend !== 'websocket' || typeof info.websocket !== 'string' || !info.websocket)
    throw new Error('[vite-devtools-kit] Remote connection descriptor must carry a websocket URL.')
  if (typeof info.authToken !== 'string' || !info.authToken)
    throw new Error('[vite-devtools-kit] Remote connection descriptor must carry an auth token.')
  if (typeof info.origin !== 'string')
    throw new Error('[vite-devtools-kit] Remote connection descriptor must carry an origin.')

  return info as RemoteConnectionInfo
}

/**
 * One-liner for a hosted DevTools page: reads the connection descriptor from
 * the current URL and returns a connected {@link DevToolsRpcClient}.
 *
 * Pairs with `remote: true` on a `DevToolsViewIframe` registered on the node
 * side — the core injects the descriptor into the iframe URL.
 *
 * @throws if no descriptor is present in the URL.
 */
export async function connectRemoteDevTools(
  options: ConnectRemoteDevToolsOptions = {},
): Promise<DevToolsRpcClient> {
  const info = parseRemoteConnection()
  if (!info) {
    throw new Error(
      `[vite-devtools-kit] No remote connection descriptor found in the URL. `
      + `Open this page through a Vite DevTools dock registered with \`remote: true\`.`,
    )
  }
  return getDevToolsRpcClient({
    ...options,
    connectionMeta: info,
    authToken: info.authToken,
  })
}
