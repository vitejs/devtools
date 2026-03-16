import { describe, expect, it } from 'vitest'
import { normalizeHttpServerUrl } from '../utils'

describe('normalizeHttpServerUrl', () => {
  it('formats ipv4 localhost as localhost', () => {
    expect(normalizeHttpServerUrl('127.0.0.1', 9999)).toBe('http://localhost:9999')
  })

  it('wraps ipv6 hosts in brackets', () => {
    expect(normalizeHttpServerUrl('::1', 9999)).toBe('http://[::1]:9999')
  })

  it('preserves non-ip hosts', () => {
    expect(normalizeHttpServerUrl('localhost', 9999)).toBe('http://localhost:9999')
  })
})
