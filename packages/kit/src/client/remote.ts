import type { DevframeConnection } from 'devframe/client'
import type { RemoteConnectionInfo } from '../types'
import { REMOTE_CONNECTION_KEY } from 'devframe/constants'

export {
  connectRemoteDevframe as connectRemoteDevTools,
  type ConnectRemoteDevframeOptions as ConnectRemoteDevToolsOptions,
  parseRemoteConnection,
} from '@devframes/hub/client'

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function resolveWebSocketUrl(connection: DevframeConnection): string | undefined {
  const websocket = connection.connectionMeta.websocket
  if (websocket == null)
    return

  const base = new URL(connection.metaBaseUrl)
  const protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'

  if (typeof websocket === 'number')
    return `${protocol}//${base.hostname}:${websocket}`

  if (typeof websocket === 'object') {
    if (websocket.host != null || websocket.port != null) {
      const host = websocket.host ?? `${base.hostname}:${websocket.port}`
      return new URL(websocket.path ?? '/', `${protocol}//${host}`).href
    }
    const target = new URL(websocket.path ?? '', base)
    target.protocol = protocol
    return target.href
  }

  if (/^wss?:\/\//i.test(websocket))
    return websocket

  const target = new URL(websocket, base)
  target.protocol = protocol
  return target.href
}

/**
 * Attach an existing trusted connection to a cross-origin dock URL.
 *
 * The descriptor uses the URL fragment, so its token is not sent in HTTP
 * requests or Referer headers. Kit clients consume it automatically.
 */
export function withRemoteConnection(url: string, connection: DevframeConnection): string {
  if (!connection.authToken)
    return url

  const websocket = resolveWebSocketUrl(connection)
  if (!websocket)
    return url

  const payload: RemoteConnectionInfo = {
    v: 1,
    backend: 'websocket',
    websocket,
    authToken: connection.authToken,
    origin: new URL(connection.metaBaseUrl).origin,
  }
  const descriptor = `${REMOTE_CONNECTION_KEY}=${base64UrlEncode(JSON.stringify(payload))}`
  const hashIndex = url.indexOf('#')
  if (hashIndex === -1)
    return `${url}#${descriptor}`

  const prefix = url.slice(0, hashIndex + 1)
  const hash = url.slice(hashIndex + 1)
  return `${prefix}${hash}${hash ? '&' : ''}${descriptor}`
}
