import type { Plugin, ResolvedConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { createDevToolsContext } from '../../../../core/src/node/context'
import { DevToolsViteInspect } from '../inspect/plugin'

function createConfig(plugin: Plugin, command: 'serve' | 'build'): ResolvedConfig {
  return {
    root: process.cwd(),
    command,
    plugins: [plugin],
    environments: {
      client: {},
    },
    createResolver: () => async (id: string) => id,
  } as unknown as ResolvedConfig
}

async function createContext(command: 'serve' | 'build') {
  const plugin = DevToolsViteInspect()
  const config = createConfig(plugin, command)

  await (plugin.configResolved as (config: ResolvedConfig) => void | Promise<void>)(config)

  return createDevToolsContext(config)
}

describe('devToolsViteInspect', () => {
  it('registers inspect RPC in dev mode', async () => {
    const ctx = await createContext('serve')

    expect(ctx.rpc.definitions.has('vite:inspect:get-metadata')).toBe(true)
    expect(ctx.rpc.definitions.has('vite:inspect:get-modules-list')).toBe(true)
    expect(ctx.rpc.definitions.has('vite:inspect:get-plugin-details')).toBe(true)
  })

  it('keeps inspect RPC disabled in build mode', async () => {
    const ctx = await createContext('build')

    expect(ctx.rpc.definitions.has('vite:meta-info')).toBe(true)
    expect(ctx.rpc.definitions.has('vite:inspect:get-metadata')).toBe(false)
  })
})
