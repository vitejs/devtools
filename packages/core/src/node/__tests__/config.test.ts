import { describe, expect, it } from 'vitest'
import { isDevToolsEnabled, normalizeDevToolsConfig } from '../config'

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
