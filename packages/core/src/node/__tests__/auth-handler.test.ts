import type { ResolvedConfig } from 'vite'
import process from 'node:process'
import { describe, expect, it, vi } from 'vitest'
import { getAuthHandler } from '../auth-handler'
import { normalizeDevToolsConfig } from '../config'
import { createDevToolsContext } from '../context'
import '@vitejs/devtools-kit'

function createConfig(): ResolvedConfig {
  return {
    root: process.cwd(),
    command: 'serve',
    plugins: [],
    server: { port: 5173 },
  } as unknown as ResolvedConfig
}

describe('getAuthHandler banner', () => {
  it('forwards a configured banner to the interactive auth handler', async () => {
    const banner = vi.fn()
    const ctx = await createDevToolsContext(
      createConfig(),
      undefined,
      normalizeDevToolsConfig({ banner }, 'localhost'),
    )

    getAuthHandler(ctx).printBanner()

    expect(banner).toHaveBeenCalledTimes(1)
    const [info] = banner.mock.calls[0]!
    expect(info.code).toMatch(/\S/)
    expect(info.url).toContain(info.code)
  })

  it('falls back to the default stdout banner when unset', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ctx = await createDevToolsContext(
      createConfig(),
      undefined,
      normalizeDevToolsConfig(true, 'localhost'),
    )

    try {
      getAuthHandler(ctx).printBanner()
      expect(log).toHaveBeenCalled()
    }
    finally {
      log.mockRestore()
    }
  })
})
