import type { ConnectionMeta } from '@vitejs/devtools-kit'

export interface InspectedWindowMetadata {
  authToken?: string
  connectionMeta: ConnectionMeta & { baseUrl: string }
}

interface InspectedWindowSnapshot {
  authToken?: string
  connectionMeta?: ConnectionMeta
}

type InspectedWindowConnectionMeta = ConnectionMeta & { baseUrl: string }

export const DEVFRAME_CONNECTION_META_KEY = '__DEVFRAME_CONNECTION_META__'
export const DEVFRAME_CONNECTION_AUTH_TOKEN_KEY = '__DEVFRAME_CONNECTION_AUTH_TOKEN__'

export const metadataEval = `
  (() => {
    let authToken
    try {
      authToken = localStorage.getItem(${JSON.stringify(DEVFRAME_CONNECTION_AUTH_TOKEN_KEY)}) || undefined
    }
    catch {}

    const connectionMeta = window[${JSON.stringify(DEVFRAME_CONNECTION_META_KEY)}] || undefined
    return {
      connectionMeta,
      authToken: window[${JSON.stringify(DEVFRAME_CONNECTION_AUTH_TOKEN_KEY)}] || authToken,
    }
  })()
`

function inspectWindow(): Promise<InspectedWindowSnapshot | null> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval<InspectedWindowSnapshot>(metadataEval, (snapshot, exceptionInfo) => {
      resolve(exceptionInfo || !snapshot ? null : snapshot)
    })
  })
}

export function resolveInspectedWindowConnectionMeta(
  connectionMeta: InspectedWindowConnectionMeta,
): InspectedWindowConnectionMeta {
  if (typeof connectionMeta.websocket !== 'number')
    return connectionMeta

  // Devframe resolves a numeric endpoint against the client's location. For
  // an extension panel that location is chrome-extension://<id>, so anchor
  // the side-car port to the inspected page's metadata URL instead.
  const websocketUrl = new URL(connectionMeta.baseUrl)
  websocketUrl.protocol = websocketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  websocketUrl.port = String(connectionMeta.websocket)
  websocketUrl.pathname = '/'
  websocketUrl.search = ''
  websocketUrl.hash = ''

  return {
    ...connectionMeta,
    websocket: websocketUrl.href,
  }
}

export async function getInspectedWindowMetadata(): Promise<InspectedWindowMetadata | null> {
  const snapshot = await inspectWindow()
  if (!snapshot?.connectionMeta?.baseUrl)
    return null

  return {
    connectionMeta: resolveInspectedWindowConnectionMeta(
      snapshot.connectionMeta as InspectedWindowConnectionMeta,
    ),
    authToken: snapshot.authToken,
  }
}

export async function registerBrowserExtensionOrigin(
  connectionMetaUrl: string,
  extensionOrigin = globalThis.location.origin,
): Promise<void> {
  const registrationUrl = new URL(connectionMetaUrl)
  registrationUrl.searchParams.set('browser-extension-origin', extensionOrigin)
  const response = await fetch(registrationUrl.href, {
    cache: 'no-store',
  })
  if (!response.ok)
    throw new Error(`Unable to register the browser extension origin (${response.status}).`)
}
