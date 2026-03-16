import { describe, expect, it } from 'vitest'
import { normalizeHttpHost } from '../utils'

describe('normalizeHttpHost', () => {
  it('formats ipv4 localhost as localhost', () => {
    expect(normalizeHttpHost('127.0.0.1', 9999)).toBe('http://localhost:9999')
  })

  it('wraps ipv6 hosts in brackets', () => {
    expect(normalizeHttpHost('::1', 9999)).toBe('http://[::1]:9999')
  })

  it('preserves non-ip hosts', () => {
    expect(normalizeHttpHost('localhost', 9999)).toBe('http://localhost:9999')
  })
})
