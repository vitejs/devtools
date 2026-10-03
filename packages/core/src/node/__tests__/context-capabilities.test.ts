import type { Plugin, ResolvedConfig } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { createDevToolsContext } from '../context'
import '@vitejs/devtools-kit'

function createConfig(plugins: Plugin[], command: 'serve' | 'build' = 'build'): ResolvedConfig {
  return {
    root: process.cwd(),
    command,
    plugins,
  } as unknown as ResolvedConfig
}

describe('createDevToolsContext capabilities gating', () => {
  it('skips setup when mode capability is false', async () => {
    const setup = vi.fn()
    const plugin: Plugin = {
      name: 'test-capability-disabled-mode',
      devtools: {
        capabilities: {
          build: false,
        },
        setup,
      },
    }

    await createDevToolsContext(createConfig([plugin], 'build'))

    expect(setup).not.toHaveBeenCalled()
  })

  it('skips setup when any explicit capability in current mode is false', async () => {
    const setup = vi.fn()
    const plugin: Plugin = {
      name: 'test-capability-disabled-rpc',
      devtools: {
        capabilities: {
          build: {
            rpc: false,
          },
        },
        setup,
      },
    }

    await createDevToolsContext(createConfig([plugin], 'build'))

    expect(setup).not.toHaveBeenCalled()
  })

  it('runs setup when all current mode capabilities are enabled', async () => {
    const setup = vi.fn()
    const plugin: Plugin = {
      name: 'test-capability-enabled',
      devtools: {
        capabilities: {
          build: {
            rpc: true,
            views: true,
          },
        },
        setup,
      },
    }

    await createDevToolsContext(createConfig([plugin], 'build'))

    expect(setup).toHaveBeenCalledTimes(1)
  })

  it('runs setup when capabilities are omitted', async () => {
    const setup = vi.fn()
    const plugin: Plugin = {
      name: 'test-capability-omitted',
      devtools: {
        setup,
      },
    }

    await createDevToolsContext(createConfig([plugin], 'build'))

    expect(setup).toHaveBeenCalledTimes(1)
  })
})
