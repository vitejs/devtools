import type { RemoteConnectionInfo } from '../types'
import { Buffer } from 'node:buffer'
import { REMOTE_CONNECTION_KEY } from 'devframe/constants'
import { describe, expect, it } from 'vitest'
import { parseRemoteConnection } from './remote'

function encode(payload: Partial<RemoteConnectionInfo>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const VALID_PAYLOAD: RemoteConnectionInfo = {
  v: 1,
  backend: 'websocket',
  websocket: 'ws://localhost:7812',
  authToken: 'happy-lion-7',
  origin: 'http://localhost:5173',
}

describe('parseRemoteConnection', () => {
  it('returns null when the URL carries no descriptor', () => {
    expect(parseRemoteConnection('https://example.com/page')).toBeNull()
  })

  it('parses a fragment-transport descriptor', () => {
    const encoded = encode(VALID_PAYLOAD)
    const url = `https://example.com/page#${REMOTE_CONNECTION_KEY}=${encoded}`
    expect(parseRemoteConnection(url)).toEqual(VALID_PAYLOAD)
  })

  it('parses a query-transport descriptor', () => {
    const encoded = encode(VALID_PAYLOAD)
    const url = `https://example.com/page?${REMOTE_CONNECTION_KEY}=${encoded}`
    expect(parseRemoteConnection(url)).toEqual(VALID_PAYLOAD)
  })

  it('prefers fragment over query when both are present', () => {
    const fragPayload = { ...VALID_PAYLOAD, authToken: 'from-fragment' }
    const queryPayload = { ...VALID_PAYLOAD, authToken: 'from-query' }
    const url = `https://example.com/page`
      + `?${REMOTE_CONNECTION_KEY}=${encode(queryPayload)}`
      + `#${REMOTE_CONNECTION_KEY}=${encode(fragPayload)}`
    expect(parseRemoteConnection(url)?.authToken).toBe('from-fragment')
  })

  it('accepts a raw fragment string', () => {
    const encoded = encode(VALID_PAYLOAD)
    expect(parseRemoteConnection(`#${REMOTE_CONNECTION_KEY}=${encoded}`)).toEqual(VALID_PAYLOAD)
  })

  it('accepts a raw query string', () => {
    const encoded = encode(VALID_PAYLOAD)
    expect(parseRemoteConnection(`?${REMOTE_CONNECTION_KEY}=${encoded}`)).toEqual(VALID_PAYLOAD)
  })

  it('throws on malformed base64', () => {
    const url = `https://example.com/page#${REMOTE_CONNECTION_KEY}=not@valid!base64`
    expect(() => parseRemoteConnection(url)).toThrow(/Failed to decode/)
  })

  it('throws on version mismatch', () => {
    const encoded = encode({ ...VALID_PAYLOAD, v: 2 as 1 })
    const url = `https://example.com/page#${REMOTE_CONNECTION_KEY}=${encoded}`
    expect(() => parseRemoteConnection(url)).toThrow(/Unsupported remote connection descriptor version/)
  })

  it('throws when required fields are missing', () => {
    const encoded = encode({ v: 1, backend: 'websocket' })
    const url = `https://example.com/page#${REMOTE_CONNECTION_KEY}=${encoded}`
    expect(() => parseRemoteConnection(url)).toThrow(/websocket URL/)
  })

  it('throws when payload is not an object', () => {
    const encoded = encode(null as unknown as RemoteConnectionInfo)
    const url = `https://example.com/page#${REMOTE_CONNECTION_KEY}=${encoded}`
    expect(() => parseRemoteConnection(url)).toThrow(/must be an object/)
  })
})
