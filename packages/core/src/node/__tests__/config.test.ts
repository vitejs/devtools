import { describe, expect, it } from 'vitest'
import { isDevToolsEnabled, normalizeDevToolsConfig, resolveHost } from '../config'

describe('resolveHost', () => {
  it.each([
    { host: undefined, expected: 'localhost' },
    { host: false, expected: 'localhost' },
    { host: true, expected: 'localhost' },
    { host: '0.0.0.0', expected: '0.0.0.0' },
    { host: 'dev.example.com', expected: 'dev.example.com' },
  ] as const)('resolves $host to $expected', ({ host, expected }) => {
    expect(resolveHost(host)).toBe(expected)
  })
})

describe('normalizeDevToolsConfig', () => {
  it.each([
    { raw: undefined, enabled: false },
    { raw: false, enabled: false },
    { raw: true, enabled: true },
    { raw: {}, enabled: true },
    { raw: { enabled: false }, enabled: false },
    { raw: { apply: 'serve' }, enabled: true },
    { raw: { apply: 'build' }, enabled: true },
    { raw: { apply: 'all' }, enabled: true },
  ] as const)('normalizes $raw', ({ raw, enabled }) => {
    expect(normalizeDevToolsConfig(raw, 'localhost').enabled).toBe(enabled)
  })

  it('keeps apply separate from runtime options', () => {
    expect(normalizeDevToolsConfig({ apply: 'serve' }, 'localhost')).toEqual({
      apply: 'serve',
      enabled: true,
      config: {
        clientAuth: true,
        clientAuthTokens: [],
        host: 'localhost',
      },
    })
  })

  it('normalizes an omitted apply option to all', () => {
    expect(normalizeDevToolsConfig(true, 'localhost').apply).toBe('all')
  })

  it('resolves the fallback host from the Vite server option', () => {
    expect(normalizeDevToolsConfig(true, undefined).config.host).toBe('localhost')
    expect(normalizeDevToolsConfig(true, true).config.host).toBe('localhost')
    expect(normalizeDevToolsConfig(true, '0.0.0.0').config.host).toBe('0.0.0.0')
  })

  it('prefers the DevTools host over the Vite server option', () => {
    expect(normalizeDevToolsConfig({ host: 'dev.example.com' }, true).config.host).toBe('dev.example.com')
  })

  it.each([
    { apply: 'all', command: 'serve', enabled: true },
    { apply: 'all', command: 'build', enabled: true },
    { apply: 'serve', command: 'serve', enabled: true },
    { apply: 'serve', command: 'build', enabled: false },
    { apply: 'build', command: 'serve', enabled: false },
    { apply: 'build', command: 'build', enabled: true },
  ] as const)('checks $apply against $command', ({ apply, command, enabled }) => {
    const config = normalizeDevToolsConfig({ apply }, 'localhost')
    expect(isDevToolsEnabled(config, command)).toBe(enabled)
  })

  it('keeps every command disabled when enabled is false', () => {
    const config = normalizeDevToolsConfig({ enabled: false, apply: 'all' }, 'localhost')
    expect(isDevToolsEnabled(config, 'serve')).toBe(false)
    expect(isDevToolsEnabled(config, 'build')).toBe(false)
  })
})
