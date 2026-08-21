import type { Plugin, ResolvedConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { DevToolsIntegration } from '../plugins/integration'

function createConfig(command: 'serve' | 'build', apply: 'serve' | 'build' | 'all' = command): ResolvedConfig {
  return {
    command,
    root: '/vite-devtools-test-project',
    devtools: {
      apply,
      config: {},
      enabled: true,
    },
  } as unknown as ResolvedConfig
}

describe('devToolsIntegration', () => {
  it('returns the existing DevTools plugins for serve', async () => {
    const plugins = await DevToolsIntegration({ config: createConfig('serve') })

    expect((plugins as Plugin[]).map(plugin => plugin.name)).toEqual([
      'vite:devtools:builtin',
      'vite:devtools:injection',
      'vite:devtools:server',
    ])
  })

  it('returns the build integration plugin for build', async () => {
    const [plugin] = await DevToolsIntegration({ config: createConfig('build') })

    expect(plugin).toMatchObject({
      name: 'vite:devtools:integration',
      apply: 'build',
    })
  })

  it.each([
    { command: 'serve', expected: 'post' },
    { command: 'build', expected: undefined },
  ] as const)('uses the current $command integration when apply is all', async ({ command, expected }) => {
    const plugins = await DevToolsIntegration({ config: createConfig(command, 'all') })
    const plugin = command === 'serve'
      ? plugins.find(plugin => plugin.name === 'vite:devtools:server')
      : plugins[0]

    expect(plugin?.enforce).toBe(expected)
  })

  it('returns no plugins when apply excludes the current command', async () => {
    const plugins = await DevToolsIntegration({ config: createConfig('serve', 'build') })

    expect(plugins).toEqual([])
  })

  it('enables Rolldown DevTools for selected build environments', async () => {
    const [plugin] = await DevToolsIntegration({ config: createConfig('build') })
    const client: { build: { rolldownOptions: { devtools?: object } } } = { build: { rolldownOptions: {} } }
    const ssr: { build: { rolldownOptions: { devtools?: object } } } = { build: { rolldownOptions: {} } }
    const config = {
      devtools: {
        config: { environments: ['client'] },
        enabled: true,
      },
      environments: { client, ssr },
    } as unknown as ResolvedConfig

    const configResolved = plugin?.configResolved
    if (typeof configResolved !== 'object')
      throw new TypeError('Expected an object configResolved hook')
    await configResolved.handler.call({} as never, config)

    expect(client.build.rolldownOptions.devtools).toEqual({})
    expect(ssr.build.rolldownOptions.devtools).toBeUndefined()
  })
})
