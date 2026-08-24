import type { Plugin, ResolvedConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { DevToolsIntegration } from '../plugins/integration'

function createConfig(command: 'serve' | 'build'): ResolvedConfig {
  return {
    command,
    root: '/vite-devtools-test-project',
    environments: {},
    plugins: [],
  } as unknown as ResolvedConfig
}

function createDevToolsConfig(apply: 'serve' | 'build' | 'all') {
  return {
    host: 'localhost',
    options: { apply },
  } as const
}

describe('devToolsIntegration', () => {
  it('returns the existing DevTools plugins for serve', async () => {
    const plugins = await DevToolsIntegration({
      config: createConfig('serve'),
      devtools: createDevToolsConfig('serve'),
    })

    expect((plugins as Plugin[]).map(plugin => plugin.name)).toEqual([
      'vite:devtools:builtin',
      'vite:devtools',
      'vite:devtools:injection',
      'vite:devtools:server',
    ])
  })

  it('returns the build integration plugin for build', async () => {
    const [plugin] = await DevToolsIntegration({
      config: createConfig('build'),
      devtools: createDevToolsConfig('build'),
    })

    expect(plugin).toMatchObject({
      name: 'vite:devtools:integration',
      apply: 'build',
    })
  })

  it('creates the static build plugin from the core config', async () => {
    const plugins = await DevToolsIntegration({
      config: createConfig('build'),
      devtools: {
        host: 'localhost',
        options: { build: { withApp: true } },
      },
    })

    expect(plugins.map(plugin => plugin.name)).toContain('vite:devtools:build')
  })

  it.each([
    { command: 'serve', expected: 'post' },
    { command: 'build', expected: undefined },
  ] as const)('uses the current $command integration when apply is all', async ({ command, expected }) => {
    const plugins = await DevToolsIntegration({
      config: createConfig(command),
      devtools: createDevToolsConfig('all'),
    })
    const plugin = command === 'serve'
      ? plugins.find(plugin => plugin.name === 'vite:devtools:server')
      : plugins[0]

    expect(plugin?.enforce).toBe(expected)
  })

  it('returns no plugins when apply excludes the current command', async () => {
    const plugins = await DevToolsIntegration({
      config: createConfig('serve'),
      devtools: createDevToolsConfig('build'),
    })

    expect(plugins).toEqual([])
  })

  it('enables Rolldown DevTools for selected build environments', async () => {
    const [plugin] = await DevToolsIntegration({
      config: createConfig('build'),
      devtools: {
        host: 'localhost',
        options: { environments: ['client'] },
      },
    })
    const client: { build: { rolldownOptions: { devtools?: object } } } = { build: { rolldownOptions: {} } }
    const ssr: { build: { rolldownOptions: { devtools?: object } } } = { build: { rolldownOptions: {} } }
    const config = {
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
