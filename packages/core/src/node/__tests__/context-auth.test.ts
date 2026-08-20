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

  it('skips the interactive-auth handshake in build mode (regression #539)', async () => {
    const ctx = await createDevToolsContext(createConfig({ command: 'build' }))

    // Left unregistered so devframe's `auth: false` auto-trust shim (armed
    // by `createDevToolsHub`) can install its own noop handler and mark the
    // session trusted — see `isClientAuthDisabled`.
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
