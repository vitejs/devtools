import type { ResolvedConfig } from 'vite'
import type { DevToolsConfig } from '../config'
import process from 'node:process'
import { describe, expect, it, vi } from 'vitest'
import { getAuthHandler, getBuildCapabilityToken, isBuildCapabilityAuth, isClientAuthDisabled } from '../auth-handler'
import { createDevToolsContext } from '../context'
import '@vitejs/devtools-kit'

function createConfig(config?: Partial<DevToolsConfig>, command: 'serve' | 'build' = 'serve'): ResolvedConfig {
  return {
    root: process.cwd(),
    command,
    plugins: [],
    server: { port: 5173 },
    devtools: config === undefined ? undefined : { config },
  } as unknown as ResolvedConfig
}

describe('getAuthHandler banner', () => {
  it('forwards a configured banner to the interactive auth handler', async () => {
    const banner = vi.fn()
    const ctx = await createDevToolsContext(createConfig({ banner }))

    getAuthHandler(ctx).printBanner()

    expect(banner).toHaveBeenCalledTimes(1)
    const [info] = banner.mock.calls[0]!
    expect(info.code).toMatch(/\S/)
    expect(info.url).toContain(info.code)
  })

  it('falls back to the default stdout banner when unset', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ctx = await createDevToolsContext(createConfig())

    try {
      getAuthHandler(ctx).printBanner()
      expect(log).toHaveBeenCalled()
    }
    finally {
      log.mockRestore()
    }
  })

  it('suppresses the OTP banner in implicit build mode (trust is token-based)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ctx = await createDevToolsContext(createConfig(undefined, 'build'))

    try {
      getAuthHandler(ctx).printBanner()
      expect(log).not.toHaveBeenCalled()
    }
    finally {
      log.mockRestore()
    }
  })
})

describe('build-mode capability token', () => {
  it('flags implicit build mode as capability-token auth, not disabled', async () => {
    const ctx = await createDevToolsContext(createConfig(undefined, 'build'))

    expect(isBuildCapabilityAuth(ctx)).toBe(true)
    expect(isClientAuthDisabled(ctx)).toBe(false)
  })

  it('is not capability-token auth in dev mode', async () => {
    const ctx = await createDevToolsContext(createConfig())

    expect(isBuildCapabilityAuth(ctx)).toBe(false)
  })

  it('leaves an explicit clientAuth:false opt-out fully disabled in build mode', async () => {
    const ctx = await createDevToolsContext(createConfig({ clientAuth: false }, 'build'))

    expect(isClientAuthDisabled(ctx)).toBe(true)
    expect(isBuildCapabilityAuth(ctx)).toBe(false)
  })

  it('mints a stable, unguessable token per context', async () => {
    const ctx = await createDevToolsContext(createConfig(undefined, 'build'))

    const token = getBuildCapabilityToken(ctx)
    expect(token).toMatch(/^[\w-]{20,}$/)
    // Memoized: the same context always yields the same token.
    expect(getBuildCapabilityToken(ctx)).toBe(token)

    const other = await createDevToolsContext(createConfig(undefined, 'build'))
    expect(getBuildCapabilityToken(other)).not.toBe(token)
  })
})
