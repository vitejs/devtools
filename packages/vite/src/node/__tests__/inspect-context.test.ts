import type { Environment, Plugin, ResolvedConfig } from 'vite'
import type { ViteInspectStoreOptions } from '../inspect/store'
import type { ViteInspectPluginCallInfo } from '../inspect/types'
import { existsSync, mkdtempSync, rmSync, statSync, truncateSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ViteInspectContext } from '../inspect/context'
import { hijackPlugin } from '../inspect/hijack'

const contexts: ViteInspectContext[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.close()))
})

async function createFixture(options: {
  root?: string
  store?: ViteInspectStoreOptions
} = {}) {
  const config = {
    root: options.root || '/project',
    resolve: {
      extensions: ['.js'],
    },
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
  const ctx = await ViteInspectContext.create(options.store)
  contexts.push(ctx)
  const vite = ctx.getViteContext(config)
  const envCtx = vite.getEnvContext(env)

  return {
    ctx,
    vite,
    env,
    envCtx,
  }
}

async function waitFor(condition: () => boolean): Promise<void> {
  for (let index = 0; index < 1000 && !condition(); index++)
    await new Promise(resolve => setImmediate(resolve))
  expect(condition()).toBe(true)
}

describe('vite inspect context', () => {
  it('records module transforms and normalizes version query by default', async () => {
    const { envCtx } = await createFixture()

    envCtx.recordTransform('/src/main.ts?v=123456', {
      name: 'plugin-a',
      result: 'export const value = 1',
      start: 10,
      end: 16,
      order: 'pre',
    }, 'const value = 1')

    const modules = await envCtx.getModulesList()

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

  it('records resolveId chains and plugin metrics', async () => {
    const { envCtx } = await createFixture()

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

    await expect(envCtx.resolveId('/src/main.ts')).resolves.toBe('/src/resolved.ts')
    expect(await envCtx.getPluginMetrics()).toEqual(expect.arrayContaining([
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

  it('records plugin call details by plugin id', async () => {
    const { envCtx, vite } = await createFixture()

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

    await expect(envCtx.getPluginDetails(1)).resolves.toMatchObject({
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

    await expect(envCtx.getPluginDetails(2)).resolves.toMatchObject({
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

  it('maps plugin call modules to graph module ids', async () => {
    const { envCtx, vite } = await createFixture()
    const pluginA = vite.config.plugins[1]!

    envCtx.recordResolveId('/src/main.ts', {
      name: 'plugin-a',
      result: '/src/resolved.js',
      start: 0,
      end: 1,
    }, pluginA)
    envCtx.recordResolveIdCall('/src/resolved', {
      name: 'plugin-a',
      start: 2,
      end: 3,
    }, pluginA)

    await expect(envCtx.getPluginDetails(1)).resolves.toMatchObject({
      calls: [
        {
          module: '/src/resolved.js',
          graphModuleId: '/src/resolved.js',
        },
        {
          module: '/src/resolved',
          graphModuleId: '/src/resolved.js',
        },
      ],
    })
  })

  it('reuses the module graph resolver until inspect modules change', async () => {
    const { ctx, envCtx, vite } = await createFixture()
    const pluginA = vite.config.plugins[1]!
    const getTransformList = vi.spyOn(ctx.store, 'getTransformList')

    envCtx.recordTransform('/src/main.js', {
      name: 'plugin-a',
      result: 'export {}',
      start: 0,
      end: 1,
    }, '', pluginA)
    await envCtx.getModulesList()
    expect(getTransformList).toHaveBeenCalledTimes(1)

    await envCtx.getPluginDetails(1)
    expect(getTransformList).toHaveBeenCalledTimes(1)

    envCtx.recordTransform('/src/next.js', {
      name: 'plugin-a',
      result: 'export {}',
      start: 2,
      end: 3,
    }, '', pluginA)
    await envCtx.getPluginDetails(1)
    expect(getTransformList).toHaveBeenCalledTimes(2)
  })

  it('serves concurrent detail queries while indexed calls are pending', async () => {
    const { envCtx, vite } = await createFixture()
    const pluginA = vite.config.plugins[1]!
    const pluginB = vite.config.plugins[2]!

    envCtx.recordLoadCall('/src/a.ts', {
      name: 'plugin-a',
      start: 0,
      end: 1,
    }, pluginA)
    envCtx.recordLoadCall('/src/b.ts', {
      name: 'plugin-b',
      start: 2,
      end: 3,
    }, pluginB)

    const [detailsA, detailsB] = await Promise.all([
      envCtx.getPluginDetails(1),
      envCtx.getPluginDetails(2),
    ])
    expect(detailsA.calls).toHaveLength(1)
    expect(detailsB.calls).toHaveLength(1)
  })

  it('clears module-related inspect data on invalidation', async () => {
    const { envCtx, vite } = await createFixture()

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

    await expect(envCtx.getModuleTransformInfo('/src/resolved.ts')).resolves.toMatchObject({
      transforms: [],
    })
    expect((await envCtx.getModulesList()).map(module => module.id)).toEqual(['/src/other.ts'])
    expect((await envCtx.getPluginDetails(1)).calls.map(call => call.module)).toEqual(['/src/other.ts'])
    expect((await envCtx.getPluginDetails(2)).calls).toEqual([])
    expect(await envCtx.getPluginMetrics()).toEqual(expect.arrayContaining([
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

  it('clears environment inspect data for a full reload', async () => {
    const { envCtx, vite } = await createFixture()

    const pluginA = vite.config.plugins[1]!
    envCtx.recordResolveId('/src/main.ts', {
      name: 'plugin-a',
      result: '/src/resolved.ts',
      start: 0,
      end: 4,
    }, pluginA)
    envCtx.recordTransform('/src/resolved.ts', {
      name: 'plugin-a',
      result: 'export const value = 1',
      start: 5,
      end: 8,
    }, '', pluginA)

    expect(await envCtx.getModulesList()).toHaveLength(1)

    envCtx.clearScope()

    expect(await envCtx.getModulesList()).toEqual([])
    expect((await envCtx.getPluginMetrics()).every((metric) => {
      return metric.transform.invokeCount === 0 && metric.resolveId.invokeCount === 0
    })).toBe(true)
    await expect(envCtx.getModuleTransformInfo('/src/resolved.ts')).resolves.toMatchObject({
      transforms: [],
    })
  })

  it('supports file-backed inspect storage', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vite-inspect-'))
    const storageDir = join(dir, 'inspect')
    const filename = join(storageDir, 'payloads.bin')
    const pluginCallsFilename = join(storageDir, 'plugin-calls.bin')
    const ctx = await ViteInspectContext.create({
      filename,
    })
    contexts.push(ctx)
    const vite = ctx.getViteContext({
      root: '/project',
      plugins: [
        { name: 'plugin-a' },
      ],
    } as ResolvedConfig)
    const env = {
      name: 'client',
      mode: 'build',
      getTopLevelConfig: () => vite.config,
    } as Environment
    const envCtx = vite.getEnvContext(env)
    const result = `export const value = '${'café'.repeat(4096)}'`
    const source = `const value = '${'source'.repeat(4096)}'`
    const sourcemaps = {
      version: 3,
      sources: ['/src/main.ts'],
      sourcesContent: [source],
      mappings: 'AAAA;'.repeat(4096),
    }

    envCtx.recordTransform('/src/main.ts', {
      name: 'plugin-a',
      result,
      start: 0,
      end: 1,
      sourcemaps,
    }, source)
    expect(await envCtx.getModulesList()).toHaveLength(1)
    await expect(envCtx.getModuleTransformInfo('/src/main.ts')).resolves.toEqual({
      resolvedId: '/src/main.ts',
      transforms: [
        {
          name: '__load__',
          result: source,
          start: 0,
          end: 0,
          sourcemaps,
        },
        {
          name: 'plugin-a',
          plugin_id: 0,
          result,
          start: 0,
          end: 1,
          sourcemaps,
        },
      ],
    })
    await expect(envCtx.getPluginDetails(0)).resolves.toMatchObject({
      calls: [
        {
          id: 'transform:0:0',
          type: 'transform',
          plugin_id: 0,
          plugin_name: 'plugin-a',
          module: '/src/main.ts',
          duration: 1,
          unchanged: false,
        },
      ],
    })
    expect(existsSync(pluginCallsFilename)).toBe(true)
    expect(statSync(pluginCallsFilename).size).toBe(72)

    await ctx.close()

    expect(existsSync(filename)).toBe(true)
    rmSync(dir, { recursive: true, force: true })
  })

  it('serializes each sourcemap once before writing its payload', async () => {
    const { ctx, envCtx, vite } = await createFixture()
    const toJSON = vi.fn(() => ({
      version: 3,
      mappings: 'AAAA',
    }))

    envCtx.recordTransform('/src/serialized.ts', {
      name: 'plugin-a',
      result: 'export const serialized = true',
      start: 0,
      end: 1,
      sourcemaps: { toJSON },
    }, 'const serialized = true', vite.config.plugins[1])

    await ctx.store.flush()
    expect(toJSON).toHaveBeenCalledOnce()
    await expect(envCtx.getModuleTransformInfo('/src/serialized.ts')).resolves.toMatchObject({
      transforms: [
        { sourcemaps: { version: 3, mappings: 'AAAA' } },
        { sourcemaps: { version: 3, mappings: 'AAAA' } },
      ],
    })
    expect(toJSON).toHaveBeenCalledOnce()
  })

  it('reuses released file payload ranges after invalidation', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vite-inspect-reuse-'))
    const filename = join(dir, 'payloads.bin')
    const { ctx, envCtx, vite } = await createFixture({
      store: {
        filename,
      },
    })
    const recordTransform = async () => {
      await envCtx.recordTransform('/src/reused.ts', {
        name: 'plugin-a',
        result: `export const value = '${'result'.repeat(4096)}'`,
        start: 0,
        end: 1,
        sourcemaps: {
          version: 3,
          mappings: 'AAAA;'.repeat(4096),
        },
      }, `const value = '${'source'.repeat(4096)}'`, vite.config.plugins[1])
      await ctx.store.flush()
    }

    await recordTransform()
    const initialSize = statSync(filename).size

    for (let cycle = 0; cycle < 5; cycle++) {
      envCtx.invalidate('/src/reused.ts')
      await ctx.store.flush()
      await recordTransform()
      expect(statSync(filename).size).toBe(initialSize)
    }

    await ctx.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('keeps invalidated plugin calls out of indexed append-only segments', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vite-inspect-call-reuse-'))
    const filename = join(dir, 'payloads.bin')
    const pluginCallsFilename = join(dir, 'plugin-calls.bin')
    const { ctx, envCtx, vite } = await createFixture({
      store: {
        filename,
        maxBatchItems: 16,
      },
    })
    const plugin = vite.config.plugins[1]!
    const recordCalls = async (start: number) => {
      for (let index = 0; index < 64; index++) {
        envCtx.recordLoadCall('/src/reused.ts', {
          name: 'plugin-a',
          start: start + index,
          end: start + index + 1,
        }, plugin)
      }
      await ctx.store.flush()
    }

    await recordCalls(0)
    const initialSize = statSync(pluginCallsFilename).size
    expect(initialSize).toBe(32 + 64 * 40)
    expect((await envCtx.getPluginDetails(1)).calls).toHaveLength(64)

    envCtx.invalidate('/src/reused.ts')
    await ctx.store.flush()
    expect((await envCtx.getPluginDetails(1)).calls).toEqual([])

    await recordCalls(100)
    expect(statSync(pluginCallsFilename).size).toBe(initialSize * 2)
    expect((await envCtx.getPluginDetails(1)).calls).toHaveLength(64)

    envCtx.clearScope()
    await ctx.store.flush()
    expect((await envCtx.getPluginDetails(1)).calls).toEqual([])

    await recordCalls(200)
    expect(statSync(pluginCallsFilename).size).toBe(initialSize * 3)
    expect((await envCtx.getPluginDetails(1)).calls).toHaveLength(64)

    await ctx.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('reads only the indexed segments for the selected plugin', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vite-inspect-call-index-'))
    const filename = join(dir, 'payloads.bin')
    const pluginCallsFilename = join(dir, 'plugin-calls.bin')
    const { ctx, envCtx, vite } = await createFixture({
      store: {
        filename,
      },
    })
    const pluginA = vite.config.plugins[1]!
    const pluginB = vite.config.plugins[2]!

    for (let index = 0; index < 64; index++) {
      envCtx.recordLoadCall(`/src/a-${index}.ts`, {
        name: 'plugin-a',
        start: index,
        end: index + 1,
      }, pluginA)
    }
    await ctx.store.flush()
    const pluginAArchiveSize = statSync(pluginCallsFilename).size

    for (let index = 0; index < 64; index++) {
      envCtx.recordLoadCall(`/src/b-${index}.ts`, {
        name: 'plugin-b',
        start: 100 + index,
        end: 101 + index,
      }, pluginB)
    }
    await ctx.store.flush()
    expect(statSync(pluginCallsFilename).size).toBeGreaterThan(pluginAArchiveSize)

    truncateSync(pluginCallsFilename, pluginAArchiveSize)

    await expect(envCtx.getPluginDetails(1)).resolves.toMatchObject({
      calls: expect.arrayContaining([
        expect.objectContaining({ plugin_name: 'plugin-a' }),
      ]),
    })
    expect((await envCtx.getPluginDetails(1)).calls).toHaveLength(64)

    await ctx.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('writes queued records in bounded batches without dropping them', async () => {
    const { ctx, envCtx, vite } = await createFixture({
      store: {
        maxBatchItems: 2,
      },
    })
    for (let index = 0; index < 5; index++) {
      envCtx.recordTransform(`/src/module-${index}.ts`, {
        name: 'plugin-a',
        result: `export const value = ${index}`,
        start: index,
        end: index + 1,
      }, `const value = ${index}`, vite.config.plugins[1])
    }

    expect(ctx.store.getStats()).toMatchObject({
      maxBatchItems: 2,
      queuedItems: 5,
      peakQueuedItems: 5,
    })
    await ctx.store.flush()
    expect(ctx.store.getStats()).toMatchObject({
      queuedItems: 0,
      inFlightItems: 0,
      writeBatches: 3,
    })
    expect(await envCtx.getModulesList()).toHaveLength(5)
  })

  it('does not delay concurrent plugin hooks while writes are queued', async () => {
    const { ctx, env, envCtx, vite } = await createFixture({
      store: {
        maxBatchItems: 1,
      },
    })
    const plugin = vite.config.plugins[1]! as Plugin & {
      transform: NonNullable<Plugin['transform']>
    }
    const hookResolvers: Array<() => void> = []
    let startedHooks = 0

    plugin.transform = async (code) => {
      startedHooks += 1
      await new Promise<void>(resolve => hookResolvers.push(resolve))
      return {
        code: `${code}\n// transformed ${startedHooks}`,
        map: {
          version: 3,
          mappings: '',
        },
      }
    }
    hijackPlugin(plugin, ctx)

    const calls = Array.from({ length: 4 }, (_, index) => {
      return (plugin.transform as any).call(
        { environment: env },
        `export const value = ${index}`,
        `/src/module-${index}.ts`,
      )
    })

    await waitFor(() => startedHooks === 4)
    expect(startedHooks).toBe(4)
    hookResolvers.splice(0).forEach(resolve => resolve())
    await Promise.all(calls)
    await ctx.store.flush()

    expect(ctx.store.getStats()).toMatchObject({
      queuedItems: 0,
      inFlightItems: 0,
      writeBatches: 4,
    })
    expect(await envCtx.getModulesList()).toHaveLength(4)
  })

  it('preserves plugin results after inspect storage closes', async () => {
    const { ctx, env, vite } = await createFixture()
    const plugin = vite.config.plugins[1]! as Plugin & {
      transform: NonNullable<Plugin['transform']>
    }
    plugin.transform = code => `${code}\n// transformed`
    hijackPlugin(plugin, ctx)
    await ctx.close()

    await expect((plugin.transform as any).call(
      { environment: env },
      'export const value = 1',
      '/src/module.ts',
    )).resolves.toBe('export const value = 1\n// transformed')
  })

  it('persists an oversized record without truncating it', async () => {
    const { ctx, envCtx, vite } = await createFixture({
      store: {
        maxBatchBytes: 64,
      },
    })

    envCtx.recordTransform('/src/large.ts', {
      name: 'plugin-a',
      result: 'x'.repeat(1024),
      start: 0,
      end: 1,
    }, 'y'.repeat(1024), vite.config.plugins[1])

    await ctx.store.flush()

    expect(ctx.store.getStats()).toMatchObject({
      queuedItems: 0,
      inFlightItems: 0,
    })
    expect(ctx.store.getStats().peakQueuedBytes).toBeGreaterThanOrEqual(4096)
    expect(await envCtx.getModulesList()).toHaveLength(1)
    await expect(envCtx.getModuleTransformInfo('/src/large.ts')).resolves.toMatchObject({
      transforms: [
        { result: 'y'.repeat(1024) },
        { result: 'x'.repeat(1024) },
      ],
    })
  })

  it('applies invalidation in enqueue order', async () => {
    const { ctx, envCtx, vite } = await createFixture({
      store: {
        maxBatchItems: 1,
      },
    })
    envCtx.recordTransform('/src/stale.ts', {
      name: 'plugin-a',
      result: 'export const stale = true',
      start: 0,
      end: 1,
    }, 'const stale = true', vite.config.plugins[1])
    envCtx.invalidate('/src/stale.ts')

    await ctx.store.flush()

    await expect(envCtx.getModuleTransformInfo('/src/stale.ts')).resolves.toMatchObject({
      transforms: [],
    })
  })

  it('preserves invalidation while payload writes are queued', async () => {
    const { ctx, envCtx, vite } = await createFixture({
      store: {
        maxBatchItems: 1,
      },
    })

    envCtx.recordTransform('/src/stale.ts', {
      name: 'plugin-a',
      result: 'export const stale = true',
      start: 0,
      end: 1,
    }, 'const stale = true', vite.config.plugins[1])
    envCtx.invalidate('/src/stale.ts')
    await ctx.store.flush()

    expect(ctx.store.getStats()).toMatchObject({
      queuedItems: 0,
      inFlightItems: 0,
    })
    await expect(envCtx.getModuleTransformInfo('/src/stale.ts')).resolves.toMatchObject({
      transforms: [],
    })
  })

  it.runIf(typeof globalThis.gc === 'function')('releases full payloads after persistence', async () => {
    const { ctx, envCtx, vite } = await createFixture({
      store: {
        maxBatchItems: 1,
      },
    })
    let sourcemapRef: WeakRef<object> | undefined

    await (async () => {
      const sourcemaps = {
        version: 3,
        mappings: 'x'.repeat(8 * 1024 * 1024),
      }
      sourcemapRef = new WeakRef(sourcemaps)
      await envCtx.recordTransform('/src/retained.ts', {
        name: 'plugin-a',
        result: 'export const retained = true',
        start: 0,
        end: 1,
        sourcemaps,
      }, 'const retained = true', vite.config.plugins[1]!)
    })()

    await ctx.store.flush()
    for (let index = 0; index < 4; index++) {
      globalThis.gc!()
      await new Promise(resolve => setImmediate(resolve))
    }

    expect(sourcemapRef?.deref()).toBeUndefined()
    expect(ctx.store.getStats()).toMatchObject({
      queuedItems: 0,
      inFlightItems: 0,
    })
  })

  it.runIf(typeof globalThis.gc === 'function')('releases plugin call objects after persistence', async () => {
    const { ctx, envCtx } = await createFixture({
      store: {
        maxBatchItems: 1,
      },
    })
    let callRef: WeakRef<ViteInspectPluginCallInfo> | undefined

    await (async () => {
      const call: ViteInspectPluginCallInfo = {
        type: 'transform',
        id: 'transform:1:0',
        duration: 1,
        plugin_id: 1,
        plugin_name: 'plugin-a',
        module: '/src/retained.ts',
        timestamp_start: 0,
        timestamp_end: 1,
        unchanged: false,
      }
      callRef = new WeakRef(call)
      ctx.store.recordPluginCall(envCtx.scope, call)
    })()

    await ctx.store.flush()
    for (let index = 0; index < 4; index++) {
      globalThis.gc!()
      await new Promise(resolve => setImmediate(resolve))
    }

    expect(callRef?.deref()).toBeUndefined()
    await expect(ctx.store.getPluginCalls(envCtx.scope, 1)).resolves.toMatchObject([
      {
        id: 'transform:1:0',
        plugin_name: 'plugin-a',
        module: '/src/retained.ts',
      },
    ])
  })

  it('records empty string load results as load output', async () => {
    const { ctx, env, envCtx, vite } = await createFixture()
    const plugin = vite.config.plugins[1]! as Plugin & {
      load: NonNullable<Plugin['load']>
    }
    plugin.load = () => ''

    hijackPlugin(plugin, ctx)
    await (plugin.load as any).call({ environment: env }, '/src/empty.ts')

    await expect(envCtx.getPluginDetails(1)).resolves.toMatchObject({
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
    const { envCtx, vite } = await createFixture()
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

    expect(await envCtx.getModulesList()).toMatchObject([
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

  it('keeps same-name plugin metrics separated by plugin id', async () => {
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
    const ctx = await ViteInspectContext.create()
    contexts.push(ctx)
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

    expect((await envCtx.getPluginMetrics()).filter(metric => metric.name === 'plugin-a')).toMatchObject([
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
    const { envCtx } = await createFixture({
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

    const modules = await envCtx.getModulesList()

    expect(modules[0]?.id).toBe('../../node_modules/.pnpm/unhead@1.0.0/node_modules/unhead/dist/index.mjs')
    await expect(envCtx.getModuleTransformInfo(modules[0]!.id)).resolves.toMatchObject({
      resolvedId: rawId,
      transforms: [
        { name: '__load__' },
        { name: 'plugin-a' },
      ],
    })
  })

  it('exposes metadata for vite instances and environments', async () => {
    const { ctx, vite } = await createFixture()

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
