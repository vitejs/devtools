import type { Plugin, ResolvedConfig } from 'vite'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createDevToolsContext } from '../../../../core/src/node/context'
import { getViteInspectContext } from '../inspect/context'
import { DevToolsViteInspect } from '../inspect/plugin'

function createConfig(plugin: Plugin, command: 'serve' | 'build', options: {
  cacheDir?: string
} = {}): ResolvedConfig {
  return {
    root: process.cwd(),
    cacheDir: options.cacheDir,
    command,
    plugins: [plugin],
    environments: {
      client: {},
    },
    createResolver: () => async (id: string) => id,
  } as unknown as ResolvedConfig
}

async function createContext(command: 'serve' | 'build', options: {
  cacheDir?: string
} = {}) {
  const plugin = DevToolsViteInspect()
  const config = createConfig(plugin, command, options)

  await (plugin.configResolved as (config: ResolvedConfig) => void | Promise<void>)(config)
  const ctx = await createDevToolsContext(config)

  return { ctx, plugin }
}

async function closePlugin(plugin: Plugin) {
  await (plugin.closeBundle as (() => void | Promise<void>) | undefined)?.()
}

describe('devToolsViteInspect', () => {
  it('registers inspect RPC in dev mode', async () => {
    const { ctx, plugin } = await createContext('serve')

    try {
      expect(ctx.rpc.definitions.has('vite:inspect:get-metadata')).toBe(true)
      expect(ctx.rpc.definitions.has('vite:inspect:get-modules-list')).toBe(true)
      expect(ctx.rpc.definitions.has('vite:inspect:get-plugin-details')).toBe(true)
    }
    finally {
      await closePlugin(plugin)
    }
  })

  it('keeps inspect RPC disabled in build mode', async () => {
    const { ctx } = await createContext('build')

    expect(ctx.rpc.definitions.has('vite:meta-info')).toBe(true)
    expect(ctx.rpc.definitions.has('vite:inspect:get-metadata')).toBe(false)
  })

  it('closes inspect storage from the plugin lifecycle', async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), 'vite-inspect-plugin-'))
    const storageDir = join(cacheDir, 'devtools', 'inspect')
    const { ctx, plugin } = await createContext('serve', { cacheDir })

    try {
      const inspectContext = getViteInspectContext(ctx)
      const close = vi.spyOn(inspectContext, 'close')

      expect(existsSync(storageDir)).toBe(true)

      await closePlugin(plugin)
      await closePlugin(plugin)

      expect(close).toHaveBeenCalledTimes(1)
      expect(existsSync(storageDir)).toBe(false)
    }
    finally {
      await closePlugin(plugin)
      rmSync(cacheDir, { recursive: true, force: true })
    }
  })
})
