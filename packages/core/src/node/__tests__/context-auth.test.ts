import type { ResolvedConfig } from 'vite'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'
import { normalizeDevToolsConfig } from '../config'
import { createDevToolsContext } from '../context'
import '@vitejs/devtools-kit'

function createConfig(command: 'serve' | 'build' = 'serve'): ResolvedConfig {
  return {
    root: process.cwd(),
    command,
    plugins: [],
  } as unknown as ResolvedConfig
}

function createDevToolsConfig(clientAuth?: boolean) {
  return normalizeDevToolsConfig(
    clientAuth === undefined ? true : { clientAuth },
    'localhost',
  )
}

describe('createDevToolsContext auth registration', () => {
  afterEach(() => {
    delete process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH
  })

  it('registers the interactive-auth handshake when client auth is enabled', async () => {
    const ctx = await createDevToolsContext(
      createConfig(),
      undefined,
      createDevToolsConfig(),
    )

    expect(ctx.rpc.definitions.has('anonymous:devframe:auth')).toBe(true)
  })

  it('registers the interactive-auth handshake in build mode for capability-token trust (#552)', async () => {
    const ctx = await createDevToolsContext(
      createConfig('build'),
      undefined,
      createDevToolsConfig(),
    )

    // Build mode keeps the gate installed and trusts via a per-process
    // capability token rather than a prompt — see `isBuildCapabilityAuth`.
    expect(ctx.rpc.definitions.has('anonymous:devframe:auth')).toBe(true)
  })

  it('skips the interactive-auth handshake in build mode when clientAuth is explicitly false', async () => {
    const ctx = await createDevToolsContext(
      createConfig('build'),
      undefined,
      createDevToolsConfig(false),
    )

    expect(ctx.rpc.definitions.has('anonymous:devframe:auth')).toBe(false)
  })

  it('skips the interactive-auth handshake when `devtools.clientAuth` is false (regression #539)', async () => {
    const ctx = await createDevToolsContext(
      createConfig(),
      undefined,
      createDevToolsConfig(false),
    )

    expect(ctx.rpc.definitions.has('anonymous:devframe:auth')).toBe(false)
  })

  it('skips the interactive-auth handshake when VITE_DEVTOOLS_DISABLE_CLIENT_AUTH=true (regression #539)', async () => {
    process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH = 'true'

    const ctx = await createDevToolsContext(
      createConfig(),
      undefined,
      createDevToolsConfig(),
    )

    expect(ctx.rpc.definitions.has('anonymous:devframe:auth')).toBe(false)
  })
})
