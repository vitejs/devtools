import { isPackageExists } from 'local-pkg'
import { resolve } from 'pathe'
import { resolveConfig } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { createDevToolsPlugins, DevTools } from '../index'
import { DevToolsIntegration } from '../integration'

vi.mock('local-pkg', () => ({
  isPackageExists: vi.fn(() => false),
}))

describe('devTools', () => {
  it('marks the public manual plugin entry', async () => {
    const manualPlugins = await DevTools({ builtinDevTools: false })
    const internalPlugins = await createDevToolsPlugins({ builtinDevTools: false })

    expect(manualPlugins.map(plugin => plugin.name)).toContain('vite:devtools')
    expect(internalPlugins.map(plugin => plugin.name)).not.toContain('vite:devtools')
  })

  it('resolves optional integrations from the configured project directory', async () => {
    const cwd = 'project/root'
    const resolvedCwd = resolve(cwd)

    await DevTools({ cwd })

    expect(vi.mocked(isPackageExists)).toHaveBeenCalledTimes(5)
    expect(vi.mocked(isPackageExists).mock.calls).toEqual([
      ['@vitejs/devtools-agent', { paths: [resolvedCwd] }],
      ['@vitejs/devtools-rolldown', { paths: [resolvedCwd] }],
      ['@vitejs/devtools-vite', { paths: [resolvedCwd] }],
      ['@vitejs/devtools-vitest', { paths: [resolvedCwd] }],
      ['@vitejs/devtools-oxc', { paths: [resolvedCwd] }],
    ])
  })

  it('automatically registers the installed agent integration', async () => {
    vi.mocked(isPackageExists).mockImplementation(name => name === '@vitejs/devtools-agent')
    try {
      const plugins = await DevTools({ cwd: '/project' })
      expect(plugins.filter(plugin => plugin.name === 'vite:devtools:agent')).toHaveLength(1)
    }
    finally {
      vi.mocked(isPackageExists).mockImplementation(() => false)
    }
  })

  it('populates the resolved config for the manual plugin', async () => {
    let observedDevTools: unknown
    const plugins = await DevTools({
      builtinDevTools: false,
      embeddedVisibility: 'passive',
      clientAuth: false,
      clientAuthTokens: ['token'],
    })
    const config = await resolveConfig({
      configFile: false,
      plugins: [
        plugins,
        {
          name: 'observe-devtools-config',
          configResolved(config) {
            observedDevTools = config.devtools
          },
        },
      ],
    }, 'serve')

    expect(config.devtools).toMatchObject({
      apply: 'all',
      config: {
        builtinDevTools: false,
        clientAuth: false,
        clientAuthTokens: ['token'],
        embeddedVisibility: 'passive',
        host: 'localhost',
      },
      enabled: true,
    })
    expect(observedDevTools).toBe(config.devtools)
  })

  it('keeps the resolved DevTools host local when the Vite server host is true', async () => {
    const plugins = await DevTools({ builtinDevTools: false })
    const config = await resolveConfig({
      configFile: false,
      plugins: [plugins],
      server: { host: true },
    }, 'serve')

    expect(config.devtools).toMatchObject({
      config: { host: 'localhost' },
      enabled: true,
    })
  })

  it('uses the explicitly registered manual plugin when auto integration is disabled', async () => {
    const config = await resolveConfig({
      configFile: false,
      devtools: false,
      plugins: [DevTools({ builtinDevTools: false })],
    }, 'serve')

    expect(config.devtools).toMatchObject({
      config: { builtinDevTools: false },
      enabled: true,
    })
  })

  it('rejects duplicate manual plugin instances', async () => {
    await expect(resolveConfig({
      configFile: false,
      plugins: [
        DevTools({ builtinDevTools: false }),
        DevTools({ builtinDevTools: false }),
      ],
    }, 'serve')).rejects.toThrow('Vite DevTools has been registered multiple times.')
  })

  it('rejects automatic and manual plugin instances together', async () => {
    const integrationPlugins = await DevToolsIntegration({
      command: 'serve',
      devtools: { host: 'localhost', options: true },
      root: process.cwd(),
    })

    await expect(resolveConfig({
      configFile: false,
      plugins: [
        integrationPlugins,
        DevTools({ builtinDevTools: false }),
      ],
    }, 'serve')).rejects.toThrow('Vite DevTools has been registered multiple times.')
  })
})
