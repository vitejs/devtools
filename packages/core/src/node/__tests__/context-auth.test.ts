import type { ResolvedConfig } from 'vite'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { createDevToolsContext } from '../context'
import '@vitejs/devtools-kit'

function createConfig(options: {
  command?: 'serve' | 'build'
  clientAuth?: boolean
} = {}): ResolvedConfig {
  return {
    root: process.cwd(),
    command: options.command ?? 'serve',
    plugins: [],
    devtools: options.clientAuth === undefined
      ? undefined
      : { config: { clientAuth: options.clientAuth } },
  } as unknown as ResolvedConfig
}

describe('createDevToolsContext auth registration', () => {
  afterEach(() => {
    delete process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH
  })

  it('registers the interactive-auth handshake when client auth is enabled', async () => {
    const ctx = await createDevToolsContext(createConfig())

    expect(ctx.rpc.definitions.has('anonymous:devframe:auth')).toBe(true)
  })

  it('registers the interactive-auth handshake in build mode for capability-token trust (#552)', async () => {
    const ctx = await createDevToolsContext(createConfig({ command: 'build' }))

    // Build mode keeps the gate installed and trusts via a per-process
    // capability token rather than a prompt — see `isBuildCapabilityAuth`.
    expect(ctx.rpc.definitions.has('anonymous:devframe:auth')).toBe(true)
  })

  it('skips the interactive-auth handshake in build mode when clientAuth is explicitly false', async () => {
    const ctx = await createDevToolsContext(createConfig({ command: 'build', clientAuth: false }))

    expect(ctx.rpc.definitions.has('anonymous:devframe:auth')).toBe(false)
  })

  it('skips the interactive-auth handshake when `devtools.clientAuth` is false (regression #539)', async () => {
    const ctx = await createDevToolsContext(createConfig({ clientAuth: false }))

    expect(ctx.rpc.definitions.has('anonymous:devframe:auth')).toBe(false)
  })

  it('skips the interactive-auth handshake when VITE_DEVTOOLS_DISABLE_CLIENT_AUTH=true (regression #539)', async () => {
    process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH = 'true'

    const ctx = await createDevToolsContext(createConfig())

    expect(ctx.rpc.definitions.has('anonymous:devframe:auth')).toBe(false)
  })
})
