import type { DocksContext } from '@vitejs/devtools-kit/client'
import { describe, expect, it } from 'vitest'
import { getDocksContextOrigin, getRpcConnectionOrigin, resolveDockIframeUrl } from './iframe-url'

function createContext(metaBaseUrl?: string, legacyBaseUrl?: string): DocksContext {
  const connectionMeta = {
    backend: 'websocket' as const,
    baseUrl: legacyBaseUrl,
  }
  return {
    rpc: {
      connection: metaBaseUrl
        ? {
            connectionMeta,
            metaBaseUrl,
          }
        : undefined,
      connectionMeta,
    },
  } as DocksContext
}

describe('iframe URL resolution', () => {
  it('uses the Devframe connection origin for standalone viewers', () => {
    const context = createContext('http://localhost:5173/__devtools/__connection.json')

    expect(getDocksContextOrigin(context)).toBe('http://localhost:5173')
    expect(getRpcConnectionOrigin(context.rpc)).toBe('http://localhost:5173')
    expect(resolveDockIframeUrl('/__devtools-vite/', getDocksContextOrigin(context)))
      .toBe('http://localhost:5173/__devtools-vite/')
  })

  it('supports legacy metadata carrying its source URL', () => {
    const context = createContext(
      undefined,
      'http://localhost:4173/__devtools/__connection.json',
    )

    expect(getDocksContextOrigin(context)).toBe('http://localhost:4173')
  })
})
