import type { Environment, Plugin, ResolvedConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { ViteInspectContext } from '../inspect/context'
import { hijackPlugin } from '../inspect/hijack'

function createFixture(options: {
  root?: string
} = {}) {
  const config = {
    root: options.root || '/project',
    plugins: [
      { name: 'vite:load-fallback' },
      { name: 'plugin-a', enforce: 'pre' },
      { name: 'plugin-b' },
    ],
  } as ResolvedConfig
  const env = {
    name: 'client',
    mode: 'build',
    getTopLevelConfig: () => config,
  } as Environment
  const ctx = new ViteInspectContext()
  const vite = ctx.getViteContext(config)
  const envCtx = vite.getEnvContext(env)

  return {
    ctx,
    vite,
    env,
    envCtx,
  }
}

describe('vite inspect context', () => {
  it('records module transforms and normalizes version query by default', () => {
    const { envCtx } = createFixture()

    envCtx.recordTransform('/src/main.ts?v=123456', {
      name: 'plugin-a',
      result: 'export const value = 1',
      start: 10,
      end: 16,
      order: 'pre',
    }, 'const value = 1')

    const modules = envCtx.getModulesList()

    expect(modules).toMatchObject([
      {
        id: '/src/main.ts',
        plugins: [
          { name: '__load__', transform: 0 },
          { name: 'plugin-a', transform: 6 },
        ],
        totalTime: 6,
        invokeCount: 1,
        sourceSize: 15,
        distSize: 22,
      },
    ])
  })

  it('records resolveId chains and plugin metrics', () => {
    const { envCtx } = createFixture()

    envCtx.recordResolveId('/src/main.ts', {
      name: 'plugin-a',
      result: '/src/resolved.ts',
      start: 0,
      end: 4,
    })
    envCtx.recordTransform('/src/resolved.ts', {
      name: 'plugin-b',
      result: 'export {}',
      start: 5,
      end: 8,
    }, '')

    expect(envCtx.resolveId('/src/main.ts')).toBe('/src/resolved.ts')
    expect(envCtx.getPluginMetrics()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'plugin-a',
        resolveId: {
          invokeCount: 1,
          totalTime: 4,
        },
      }),
      expect.objectContaining({
        name: 'plugin-b',
        transform: {
          invokeCount: 1,
          totalTime: 3,
        },
      }),
    ]))
  })

  it('records plugin call details by plugin id', () => {
    const { envCtx, vite } = createFixture()

    const pluginA = vite.config.plugins[1]!
    const pluginB = vite.config.plugins[2]!

    envCtx.recordResolveId('/src/main.ts', {
      name: 'plugin-a',
      result: '/src/resolved.ts',
      start: 0,
      end: 4,
    }, pluginA)
    envCtx.recordLoad('/src/resolved.ts', {
      name: 'plugin-a',
      result: 'export const value = 1',
      start: 5,
      end: 7,
    }, pluginA)
    envCtx.recordTransform('/src/resolved.ts', {
      name: 'plugin-b',
      result: 'export const value = 2',
      start: 8,
      end: 14,
    }, 'export const value = 1', pluginB)

    expect(envCtx.getPluginDetails(1)).toMatchObject({
      plugin_name: 'plugin-a',
      plugin_id: 1,
      calls: [
        {
          type: 'resolve',
          plugin_id: 1,
          plugin_name: 'plugin-a',
          module: '/src/resolved.ts',
          duration: 4,
          timestamp_start: 0,
          timestamp_end: 4,
        },
        {
          type: 'load',
          plugin_id: 1,
          plugin_name: 'plugin-a',
          module: '/src/resolved.ts',
          duration: 2,
          unchanged: false,
        },
      ],
      resolveIdMetrics: [
        expect.objectContaining({ type: 'resolve' }),
      ],
      loadMetrics: [
        expect.objectContaining({ type: 'load' }),
      ],
      transformMetrics: [],
    })

    expect(envCtx.getPluginDetails(2)).toMatchObject({
      plugin_name: 'plugin-b',
      transformMetrics: [
        expect.objectContaining({
          type: 'transform',
          duration: 6,
          unchanged: false,
        }),
      ],
    })
  })

  it('clears module-related inspect data on invalidation', () => {
    const { envCtx, vite } = createFixture()

    const pluginA = vite.config.plugins[1]!
    const pluginB = vite.config.plugins[2]!

    envCtx.recordResolveId('/src/main.ts', {
      name: 'plugin-a',
      result: '/src/resolved.ts',
      start: 0,
      end: 4,
    }, pluginA)
    envCtx.recordLoad('/src/resolved.ts', {
      name: 'plugin-a',
      result: 'export const value = 1',
      start: 5,
      end: 7,
    }, pluginA)
    envCtx.recordTransform('/src/resolved.ts', {
      name: 'plugin-b',
      result: 'export const value = 2',
      start: 8,
      end: 14,
    }, 'export const value = 1', pluginB)
    envCtx.recordTransform('/src/other.ts', {
      name: 'plugin-a',
      result: 'export const other = 1',
      start: 15,
      end: 18,
    }, '', pluginA)

    envCtx.invalidate('/src/resolved.ts')

    expect(envCtx.data.transform['/src/resolved.ts']).toBeUndefined()
    expect(envCtx.data.transformCounter['/src/resolved.ts']).toBeUndefined()
    expect(envCtx.data.resolveId['/src/main.ts']).toBeUndefined()
    expect(envCtx.getModulesList().map(module => module.id)).toEqual(['/src/other.ts'])
    expect(envCtx.getPluginDetails(1).calls.map(call => call.module)).toEqual(['/src/other.ts'])
    expect(envCtx.getPluginDetails(2).calls).toEqual([])
    expect(envCtx.getPluginMetrics()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'plugin-a',
        transform: {
          invokeCount: 1,
          totalTime: 3,
        },
        resolveId: {
          invokeCount: 0,
          totalTime: 0,
        },
      }),
    ]))
  })

  it('records empty string load results as load output', async () => {
    const { ctx, env, envCtx, vite } = createFixture()
    const plugin = vite.config.plugins[1]! as Plugin & {
      load: NonNullable<Plugin['load']>
    }
    plugin.load = () => ''

    hijackPlugin(plugin, ctx)
    await (plugin.load as any).call({ environment: env }, '/src/empty.ts')

    expect(envCtx.getPluginDetails(1)).toMatchObject({
      loadMetrics: [
        {
          type: 'load',
          plugin_id: 1,
          plugin_name: 'plugin-a',
          module: '/src/empty.ts',
          unchanged: false,
        },
      ],
    })
    await expect(envCtx.getModuleTransformInfo('/src/empty.ts')).resolves.toMatchObject({
      transforms: [
        {
          name: 'plugin-a',
          result: '',
        },
      ],
    })
  })

  it('keeps empty string transform results in module metrics', async () => {
    const { envCtx, vite } = createFixture()
    const pluginA = vite.config.plugins[1]!
    const pluginB = vite.config.plugins[2]!

    envCtx.recordLoad('/src/empty.ts', {
      name: 'plugin-a',
      result: '',
      start: 0,
      end: 2,
    }, pluginA)
    envCtx.recordTransform('/src/empty.ts', {
      name: 'plugin-b',
      result: 'export {}',
      start: 3,
      end: 8,
    }, '', pluginB)

    expect(envCtx.getModulesList()).toMatchObject([
      {
        id: '/src/empty.ts',
        plugins: [
          { name: 'plugin-a', transform: 2 },
          { name: 'plugin-b', transform: 5 },
        ],
        totalTime: 7,
        sourceSize: 0,
        distSize: 9,
      },
    ])
    await expect(envCtx.getModuleTransformInfo('/src/empty.ts')).resolves.toMatchObject({
      transforms: [
        {
          name: 'plugin-a',
          result: '',
        },
        {
          name: 'plugin-b',
          result: 'export {}',
        },
      ],
    })
  })

  it('keeps same-name plugin metrics separated by plugin id', () => {
    const config = {
      root: '/project',
      plugins: [
        { name: 'plugin-a' },
        { name: 'plugin-a' },
      ],
    } as ResolvedConfig
    const env = {
      name: 'client',
      mode: 'build',
      getTopLevelConfig: () => config,
    } as Environment
    const ctx = new ViteInspectContext()
    const envCtx = ctx.getViteContext(config).getEnvContext(env)

    envCtx.recordTransform('/src/a.ts', {
      name: 'plugin-a',
      result: 'export const a = 1',
      start: 0,
      end: 3,
    }, '', config.plugins[0])
    envCtx.recordTransform('/src/b.ts', {
      name: 'plugin-a',
      result: 'export const b = 1',
      start: 4,
      end: 9,
    }, '', config.plugins[1])

    expect(envCtx.getPluginMetrics().filter(metric => metric.name === 'plugin-a')).toMatchObject([
      {
        plugin_id: 0,
        transform: {
          invokeCount: 1,
          totalTime: 3,
        },
      },
      {
        plugin_id: 1,
        transform: {
          invokeCount: 1,
          totalTime: 5,
        },
      },
    ])
  })

  it('normalizes absolute node_modules ids relative to project root', async () => {
    const { envCtx } = createFixture({
      root: '/workspace/packages/vite',
    })
    const rawId = '/workspace/node_modules/.pnpm/unhead@1.0.0/node_modules/unhead/dist/index.mjs'

    envCtx.recordTransform(`${rawId}?v=123456`, {
      name: 'plugin-a',
      result: 'export const head = {}',
      start: 10,
      end: 16,
      order: 'pre',
    }, 'const head = {}')

    const modules = envCtx.getModulesList()

    expect(modules[0]?.id).toBe('../../node_modules/.pnpm/unhead@1.0.0/node_modules/unhead/dist/index.mjs')
    await expect(envCtx.getModuleTransformInfo(modules[0]!.id)).resolves.toMatchObject({
      resolvedId: rawId,
      transforms: [
        { name: '__load__' },
        { name: 'plugin-a' },
      ],
    })
  })

  it('exposes metadata for vite instances and environments', () => {
    const { ctx, vite } = createFixture()

    expect(ctx.getMetadata()).toMatchObject({
      instances: [
        {
          root: '/project',
          vite: vite.id,
          environments: ['client'],
          environmentPlugins: {
            client: [0, 1, 2],
          },
        },
      ],
    })
  })
})
