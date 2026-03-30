import type { ConnectionMeta } from '@vitejs/devtools-kit'

interface InspectedWindowMetadata {
  origin: string
  wsUrl: string
  authToken?: string
  connectionMeta?: ConnectionMeta
}

function normalizeWsUrl(origin: string, connectionMeta?: ConnectionMeta): string {
  const url = new URL(origin)
  url.port = String(connectionMeta.websocket)
  return url.origin
}

const metadataEval = `
  ({
    origin: location.origin,
    connectionMeta: window.__VITE_DEVTOOLS_CONNECTION_META__ || undefined,
    authToken: window.__VITE_DEVTOOLS_CONNECTION_AUTH_TOKEN__,
  })    
`

export function getInspectedWindowMetadata(): Promise<InspectedWindowMetadata> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval<Omit<InspectedWindowMetadata, 'wsUrl'>>(metadataEval, (meta) => {
      resolve({
        ...meta,
        wsUrl: normalizeWsUrl(meta.origin, meta.connectionMeta),
      })
    })
  })
}
