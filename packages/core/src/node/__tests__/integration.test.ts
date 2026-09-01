import type { Plugin, ResolvedConfig } from 'vite'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeDevToolsConfig } from '../config'
import { DevToolsIntegration, runDevTools } from '../plugins/integration'
import { startDevTools } from '../start'

vi.mock('../start', () => ({
  startDevTools: vi.fn(),
}))

function createResolvedConfig(
  command: 'serve' | 'build',
  environments: ResolvedConfig['environments'] = {},
): ResolvedConfig {
  return {
    command,
    devtools: false,
    root: '/vite-devtools-test-project',
    environments,
    plugins: [],
    server: { host: 'localhost' },
  } as unknown as ResolvedConfig
}

function createIntegrationOptions(
  command: 'serve' | 'build',
  devtools = createDevToolsConfig(command),
) {
  return {
    command,
    devtools,
    root: '/vite-devtools-test-project',
  } as const
}

function createDevToolsConfig(apply: 'serve' | 'build' | 'all') {
  return {
    host: 'localhost',
    options: { apply },
  } as const
}

describe('devToolsIntegration', () => {
  beforeEach(() => {
    vi.mocked(startDevTools).mockClear()
  })

  it('returns the existing DevTools plugins for serve', async () => {
    const plugins = await DevToolsIntegration({
      ...createIntegrationOptions('serve'),
      devtools: createDevToolsConfig('serve'),
    })

    expect((plugins as Plugin[]).map(plugin => plugin.name)).toEqual([
      'vite:devtools',
      'vite:devtools:builtin',
      'vite:devtools:injection',
      'vite:devtools:server',
    ])
  })

  it('returns the build integration plugin for build', async () => {
    const plugins = await DevToolsIntegration({
      ...createIntegrationOptions('build'),
      devtools: createDevToolsConfig('build'),
    })
    const plugin = plugins.find(plugin => plugin.name === 'vite:devtools:integration')

    expect(plugin).toMatchObject({
      name: 'vite:devtools:integration',
      apply: 'build',
    })
  })

  it('creates the static build plugin from the core config', async () => {
    const plugins = await DevToolsIntegration({
      ...createIntegrationOptions('build'),
      devtools: {
        host: 'localhost',
        options: { build: { withApp: true } },
      },
    })

    expect(plugins.map(plugin => plugin.name)).toContain('vite:devtools:build')
    expect(plugins.filter(plugin => plugin.name === 'vite:devtools')).toHaveLength(1)
  })

  it.each([
    { command: 'serve', expected: 'post' },
    { command: 'build', expected: undefined },
  ] as const)('uses the current $command integration when apply is all', async ({ command, expected }) => {
    const plugins = await DevToolsIntegration({
      ...createIntegrationOptions(command),
      devtools: createDevToolsConfig('all'),
    })
    const plugin = command === 'serve'
      ? plugins.find(plugin => plugin.name === 'vite:devtools:server')
      : plugins.find(plugin => plugin.name === 'vite:devtools:integration')

    expect(plugin?.enforce).toBe(expected)
  })

  it('returns no plugins when apply excludes the current command', async () => {
    const plugins = await DevToolsIntegration({
      ...createIntegrationOptions('serve'),
      devtools: createDevToolsConfig('build'),
    })

    expect(plugins).toEqual([])
  })

  it('passes the resolved config to standalone DevTools', async () => {
    const config = createResolvedConfig('build', { client: {} as never })
    const plugins = await DevToolsIntegration({
      command: 'build',
      devtools: {
        host: 'dev.example.com',
        options: {
          allowedOrigins: ['https://dev.example.com'],
          builtinDevTools: false,
          clientAuthTokens: ['trusted-token'],
        },
      },
      root: config.root,
    })
    Object.assign(config, {
      plugins,
      server: { host: 'dev.example.com' },
    })
    const configPlugin = plugins.find(plugin => plugin.name === 'vite:devtools')
    const configResolved = configPlugin?.configResolved
    if (typeof configResolved !== 'object')
      throw new TypeError('Expected an object configResolved hook')
    await configResolved.handler.call({} as never, config)

    await runDevTools({ config })

    const resolvedConfig = {
      apply: 'all',
      config: expect.objectContaining({
        allowedOrigins: ['https://dev.example.com'],
        builtinDevTools: false,
        clientAuth: true,
        clientAuthTokens: ['trusted-token'],
        host: 'dev.example.com',
      }),
      enabled: true,
    }
    expect(startDevTools).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'dev.example.com',
        root: '/vite-devtools-test-project',
      }),
      resolvedConfig,
    )
  })

  it('does not run standalone DevTools for a manual plugin config', async () => {
    const config = createResolvedConfig('build', { client: {} as never })
    Object.assign(config, {
      devtools: normalizeDevToolsConfig(true, 'localhost'),
      plugins: [{ name: 'vite:devtools' }],
    })

    await runDevTools({ config })

    expect(startDevTools).not.toHaveBeenCalled()
  })

  it('enables Rolldown DevTools for selected build environments', async () => {
    const plugins = await DevToolsIntegration({
      ...createIntegrationOptions('build'),
      devtools: {
        host: 'localhost',
        options: { environments: ['client'] },
      },
    })
    const plugin = plugins.find(plugin => plugin.name === 'vite:devtools:integration')
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

  it('returns a pre plugin for refreshing the resolved integration config', async () => {
    const plugins = await DevToolsIntegration({
      ...createIntegrationOptions('serve'),
      devtools: createDevToolsConfig('serve'),
    })
    const configPlugin = plugins.find(plugin => plugin.name === 'vite:devtools')

    expect(configPlugin).toMatchObject({
      apply: 'serve',
      enforce: 'pre',
      configResolved: { order: 'pre' },
    })
  })
})
