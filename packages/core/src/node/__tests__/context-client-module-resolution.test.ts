import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import process from 'node:process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDevToolsContext } from '../context'
import '@vitejs/devtools-kit'

function createConfig(plugins: Plugin[], command: 'serve' | 'build' = 'serve'): ResolvedConfig {
  return {
    root: process.cwd(),
    command,
    plugins,
  } as unknown as ResolvedConfig
}

function createViteServer(): ViteDevServer {
  return {
    middlewares: {
      use: vi.fn(),
    },
  } as unknown as ViteDevServer
}

/** A plugin whose dock names its client script by npm specifier, as the kit docs show. */
function createBareSpecifierPlugin(): Plugin {
  return {
    name: 'test-bare-specifier-dock',
    devtools: {
      setup(ctx) {
        ctx.docks.register({
          id: 'test-bare-specifier',
          title: 'Test',
          icon: 'ph:bug-duotone',
          type: 'action',
          action: { importFrom: 'my-plugin/devtools-action' },
        })
      },
    },
  }
}

function spyOnDF8111() {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  return () => warn.mock.calls.filter(args => args.some(arg => String(arg).includes('DF8111'))).length
}

describe('createDevToolsContext client module resolution', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('declares the Vite `/@id/` resolver before plugin setup registers bare-specifier docks', async () => {
    const countDF8111 = spyOnDF8111()

    const ctx = await createDevToolsContext(
      createConfig([createBareSpecifierPlugin()]),
      createViteServer(),
    )

    expect(countDF8111()).toBe(0)
    expect(ctx.staticConfig.dock?.clientModuleResolution).toBe('/@id/{specifier}')
  })

  it('keeps warning DF8111 without a dev server (standalone / build), where bare specifiers stay unresolvable', async () => {
    const countDF8111 = spyOnDF8111()

    const ctx = await createDevToolsContext(
      createConfig([createBareSpecifierPlugin()], 'build'),
    )

    expect(ctx.staticConfig.dock?.clientModuleResolution).toBeUndefined()
    expect(countDF8111()).toBe(1)
  })
})
