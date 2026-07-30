import type { DocksContext } from '@vitejs/devtools-kit/client'
import { describe, expect, it } from 'vitest'
import { getDocksContextOrigin, resolveDockIframeUrl } from './iframe-url'

function createContext(baseUrl?: string): DocksContext {
  return {
    rpc: {
      connectionMeta: {
        backend: 'websocket',
        baseUrl,
      },
    },
  } as DocksContext
}

describe('iframe URL resolution', () => {
  it('uses the Devframe metadata origin for standalone viewers', () => {
    const context = createContext('http://localhost:5173/__devtools/__connection.json')

    expect(getDocksContextOrigin(context)).toBe('http://localhost:5173')
    expect(resolveDockIframeUrl('/__devtools-vite/', getDocksContextOrigin(context)))
      .toBe('http://localhost:5173/__devtools-vite/')
  })
})
