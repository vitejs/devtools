import type { Environment, Plugin, ViteDevServer } from 'vite'
import type { ViteInspectEnvironmentContext } from '../inspect/context'
import type { ViteInspectStoreOptions } from '../inspect/store'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ViteInspectContext } from '../inspect/context'
import { hijackPlugin } from '../inspect/hijack'
import { setupEnvironmentInvalidation, trackTransformRequestId } from '../inspect/server'

interface InspectServerFixture {
  server: ViteDevServer
  inspectContext: ViteInspectContext
  env: Environment
  envContext: ViteInspectEnvironmentContext
}

const fixtures: InspectServerFixture[] = []
const temporaryDirs: string[] = []

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(async ({ server, inspectContext }) => {
    await server.close()
    await inspectContext.close()
  }))
  for (const dir of temporaryDirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
})

async function createInspectServer(
  source: Map<string, string>,
  plugins: Plugin[] = [],
  storeOptions: ViteInspectStoreOptions = {},
): Promise<InspectServerFixture> {
  let inspectContext: ViteInspectContext | undefined
  const inspectProbe: Plugin = {
    name: 'test:inspect-probe',
    enforce: 'pre',
    async configResolved(config) {
      inspectContext = await ViteInspectContext.create(storeOptions)
      config.plugins.forEach(plugin => hijackPlugin(plugin, inspectContext!))
    },
    configureServer(server) {
      const vite = inspectContext!.getViteContext(server.config)
      Object.values(server.environments).forEach(env => vite.getEnvContext(env))
      setupEnvironmentInvalidation(server, vite)
    },
  }
  const virtualPlugin: Plugin = {
    name: 'test:virtual-modules',
    resolveId(id) {
      if (source.has(id))
        return id
    },
    load(id) {
      return source.get(id)
    },
  }
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: {
      middlewareMode: true,
      fs: {
        strict: false,
      },
    },
    plugins: [inspectProbe, virtualPlugin, ...plugins],
  })
  const env = server.environments.client
  const context = inspectContext!
  const envContext = context.getViteContext(server.config).getEnvContext(env)
  const fixture = {
    server,
    inspectContext: context,
    env,
    envContext,
  }
  fixtures.push(fixture)
  return fixture
}

describe('vite inspect server invalidation', () => {
  it.each(['string', 'object'] as const)('counts successful same-ID resolve time (%s)', async (result) => {
    const id = '/resolve-timing.js'
    const plugin: Plugin = {
      name: 'test:slow-resolve',
      enforce: 'pre',
      async resolveId(source) {
        if (source !== id)
          return
        await new Promise(resolve => setTimeout(resolve, 20))
        return result === 'string' ? id : { id }
      },
    }
    const { server, envContext } = await createInspectServer(new Map([[id, 'export const value = 1']]), [plugin])
    await server.transformRequest(id)
    const details = await envContext.getPluginDetails(server.config.plugins.indexOf(plugin))
    const duration = details.resolveIdMetrics.filter(call => call.module === id).reduce((sum, call) => sum + call.duration, 0)
    expect(duration).toBeGreaterThan(0)
    const [module] = await envContext.getModulesList()
    expect(module!.plugins.filter(p => p.name === plugin.name).reduce((sum, p) => sum + (p.resolveId ?? 0), 0)).toBe(duration)
    expect((await envContext.getModuleTransformInfo(id)).resolvedId).toBe(id)
    envContext.invalidate(id)
    expect(await envContext.getModulesList()).toEqual([])
    expect((await envContext.getPluginDetails(server.config.plugins.indexOf(plugin))).resolveIdMetrics.filter(call => call.module === id)).toEqual([])
  })

  it('does not assign declined resolutions by source name across importers', async () => {
    const source = '/shared.js'
    const plugin: Plugin = {
      name: 'test:declined-resolve',
      enforce: 'pre',
      resolveId(id) {
        if (id === source)
          return null
      },
    }
    const resolver: Plugin = {
      name: 'test:importer-resolve',
      resolveId(id, importer) {
        if (id === source)
          return importer === '/a.js' ? '/a/shared.js' : '/b/shared.js'
      },
    }
    const { server, envContext } = await createInspectServer(new Map([
      ['/a/shared.js', 'export const value = 1'],
      ['/b/shared.js', 'export const value = 2'],
    ]), [plugin, resolver])
    const container = server.environments.client.pluginContainer
    await container.resolveId(source, '/a.js')
    await container.resolveId(source, '/b.js')
    await server.transformRequest('/a/shared.js')
    await server.transformRequest('/b/shared.js')
    const modules = await envContext.getModulesList()
    expect(modules).toHaveLength(2)
    for (const module of modules)
      expect(module.plugins.some(p => p.name === plugin.name)).toBe(false)
    const details = await envContext.getPluginDetails(server.config.plugins.indexOf(plugin))
    expect(details.resolveIdMetrics.filter(call => call.module === source)).toHaveLength(2)
  })

  it('completes Vite transforms without waiting for payload persistence', async () => {
    const source = new Map([
      ['/entry.js', 'export const entry = 1'],
    ])
    const { server, inspectContext, envContext } = await createInspectServer(source, [], {
      maxBatchItems: 1,
      maxBatchBytes: 1,
    })

    let timeoutId: NodeJS.Timeout | undefined
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Vite transform was blocked by inspect storage')), 1000)
    })
    try {
      await expect(Promise.race([
        server.transformRequest('/entry.js'),
        timeout,
      ])).resolves.toMatchObject({
        code: 'export const entry = 1',
      })
    }
    finally {
      clearTimeout(timeoutId)
    }

    await inspectContext.store.flush()
    expect(inspectContext.store.getStats()).toMatchObject({
      queuedItems: 0,
      inFlightItems: 0,
    })
    const transformInfo = await envContext.getModuleTransformInfo('/entry.js')
    expect(transformInfo.transforms).toEqual(expect.arrayContaining([
      expect.objectContaining({ result: 'export const entry = 1' }),
    ]))
  })

  it('keeps soft-invalidated importer data when Vite reuses its transform result', async () => {
    const source = new Map([
      ['/leaf.js', 'export const leaf = 1'],
      ['/importer.js', 'import { leaf } from "/leaf.js"; export const importer = leaf'],
    ])
    let transformCalls = 0
    const counter: Plugin = {
      name: 'test:transform-counter',
      transform(_code, id) {
        if (source.has(id))
          transformCalls += 1
        return null
      },
    }
    const { server, env, envContext } = await createInspectServer(source, [counter])

    await server.transformRequest('/leaf.js')
    await server.transformRequest('/importer.js')
    const initialTransforms = (await envContext.getModuleTransformInfo('/importer.js')).transforms
    expect(initialTransforms.length).toBeGreaterThan(0)
    expect(transformCalls).toBe(2)

    const leaf = env.moduleGraph.getModuleById('/leaf.js')
    const importer = env.moduleGraph.getModuleById('/importer.js')
    expect(leaf).toBeDefined()
    expect(importer).toBeDefined()
    env.moduleGraph.invalidateModule(leaf!, new Set(), Date.now(), true)

    expect(importer!.invalidationState).not.toBe('HARD_INVALIDATED')
    await expect(envContext.getModuleTransformInfo('/leaf.js')).resolves.toMatchObject({
      transforms: [],
    })
    await expect(envContext.getModuleTransformInfo('/importer.js')).resolves.toMatchObject({
      transforms: initialTransforms,
    })

    await server.transformRequest('/importer.js')

    expect(transformCalls).toBe(2)
    expect(importer!.transformResult).toBeTruthy()
    await expect(envContext.getModuleTransformInfo('/importer.js')).resolves.toMatchObject({
      transforms: initialTransforms,
    })
  })

  it('keeps inspect data across a full reload when Vite retains its transform cache', async () => {
    const source = new Map([
      ['/entry.js', 'export const entry = 1'],
    ])
    let transformCalls = 0
    const counter: Plugin = {
      name: 'test:transform-counter',
      transform(_code, id) {
        if (source.has(id))
          transformCalls += 1
        return null
      },
    }
    const { server, env, envContext } = await createInspectServer(source, [counter])

    await server.transformRequest('/entry.js')
    const initialTransforms = (await envContext.getModuleTransformInfo('/entry.js')).transforms
    const clearScope = vi.spyOn(envContext, 'clearScope')
    expect(initialTransforms.length).toBeGreaterThan(0)

    env.hot.send({ type: 'full-reload', path: '/' })

    expect(env.hot).toBe(server.ws)
    expect(clearScope).not.toHaveBeenCalled()
    await expect(envContext.getModuleTransformInfo('/entry.js')).resolves.toMatchObject({
      transforms: initialTransforms,
    })

    await server.transformRequest('/entry.js')

    expect(transformCalls).toBe(1)
    await expect(envContext.getModuleTransformInfo('/entry.js')).resolves.toMatchObject({
      transforms: initialTransforms,
    })
  })

  it('observes each hard-invalidated module once in a diamond graph', async () => {
    const source = new Map([
      ['virtual:leaf', 'export const leaf = 1'],
      ['virtual:left', 'import { leaf } from "virtual:leaf"; export const left = leaf'],
      ['virtual:right', 'import { leaf } from "virtual:leaf"; export const right = leaf'],
      ['virtual:root', 'import { left } from "virtual:left"; import { right } from "virtual:right"; export const root = left + right'],
    ])
    const virtualIds = new Map(Array.from(source, ([id, code]) => [`\0${id}`, code]))
    const resolver: Plugin = {
      name: 'test:virtual-id-resolver',
      resolveId(id) {
        if (source.has(id))
          return `\0${id}`
      },
      load(id) {
        return virtualIds.get(id)
      },
    }
    const { server, env, envContext } = await createInspectServer(new Map(), [resolver])
    for (const id of source.keys())
      await server.transformRequest(id)

    const invalidate = vi.spyOn(envContext, 'invalidate')
    const leaf = env.moduleGraph.getModuleById('\0virtual:leaf')
    expect(leaf).toBeDefined()

    env.moduleGraph.invalidateModule(leaf!)

    const invalidatedIds = invalidate.mock.calls.map(([id]) => id)
    expect(invalidatedIds).toHaveLength(4)
    expect(new Set(invalidatedIds)).toEqual(new Set([
      '\0virtual:leaf',
      '\0virtual:left',
      '\0virtual:right',
      '\0virtual:root',
    ]))
  })

  it('applies invalidation after an older in-flight transform write', async () => {
    const source = new Map([
      ['/entry.js', 'export const entry = 1'],
    ])
    let resolveTransformStarted!: () => void
    let releaseTransform!: () => void
    const transformStarted = new Promise<void>((resolve) => {
      resolveTransformStarted = resolve
    })
    const transformGate = new Promise<void>((resolve) => {
      releaseTransform = resolve
    })
    const blockedTransform: Plugin = {
      name: 'test:blocked-transform',
      async transform(code, id) {
        if (!source.has(id))
          return null
        resolveTransformStarted()
        await transformGate
        return `${code}\nexport const finished = true`
      },
    }
    const { server, env, envContext } = await createInspectServer(source, [blockedTransform])

    const request = server.transformRequest('/entry.js')
    await transformStarted
    const entry = env.moduleGraph.getModuleById('/entry.js')
    expect(entry).toBeDefined()

    env.moduleGraph.invalidateModule(entry!)
    releaseTransform()
    await request

    expect(entry!.transformResult).toBeNull()
    await expect(envContext.getModuleTransformInfo('/entry.js')).resolves.toMatchObject({
      transforms: [],
    })
  })

  it('invalidates inspect data once for an explicit module clear', async () => {
    const source = new Map([
      ['/entry.js', 'export const entry = 1'],
    ])
    const { server, envContext } = await createInspectServer(source)
    await server.transformRequest('/entry.js')
    const invalidate = vi.spyOn(envContext, 'invalidate')

    await envContext.clearId('/entry.js')

    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith('/entry.js')
    await expect(envContext.getModuleTransformInfo('/entry.js')).resolves.toMatchObject({
      transforms: [],
    })
  })

  it('detaches completed transform requests from inherited async contexts', async () => {
    const source = new Map([
      ['/entry.js', 'export const entry = 1'],
    ])
    let releaseBackground!: () => void
    let resolveBackground!: () => void
    let request: ReturnType<typeof trackTransformRequestId>
    let lateRequest: ReturnType<typeof trackTransformRequestId>
    const backgroundGate = new Promise<void>((resolve) => {
      releaseBackground = resolve
    })
    const backgroundDone = new Promise<void>((resolve) => {
      resolveBackground = resolve
    })
    const backgroundPlugin: Plugin = {
      name: 'test:background-context',
      transform(_code, id) {
        if (!source.has(id))
          return null
        request = trackTransformRequestId(id)
        void backgroundGate.then(() => {
          lateRequest = trackTransformRequestId('/late.js')
          resolveBackground()
        })
        return null
      },
    }
    const { server } = await createInspectServer(source, [backgroundPlugin])

    await server.transformRequest('/entry.js')

    expect(request).toMatchObject({
      active: false,
      stale: false,
    })
    expect(request?.ids.size).toBe(0)

    releaseBackground()
    await backgroundDone

    expect(lateRequest).toBeUndefined()
  })
  it.each(['memory', 'disk'])('excludes failed loads from a successful retry (%s)', async (storage) => {
    const dir = mkdtempSync(join(tmpdir(), 'vite-load-retry-'))
    temporaryDirs.push(dir)
    const id = '/load-retry.js'
    const source = 'export const value = 1'
    let enabled = false
    const plugin: Plugin = {
      name: 'test:retry-load',
      enforce: 'pre',
      async load(moduleId) {
        if (moduleId !== id)
          return
        await new Promise(resolve => setTimeout(resolve, 20))
      },
    }
    const provider: Plugin = {
      name: 'test:retry-provider',
      resolveId(moduleId) {
        if (moduleId === id)
          return id
      },
      load(moduleId) {
        if (moduleId === id && enabled)
          return source
      },
    }
    const { server, envContext } = await createInspectServer(new Map(), [plugin, provider], {
      filename: storage === 'disk' ? join(dir, 'payloads.bin') : ':memory:',
      maxBatchItems: storage === 'disk' ? 1 : undefined,
    })
    await expect(server.transformRequest(id)).rejects.toThrow()
    enabled = true
    await server.transformRequest(id)

    const details = await envContext.getPluginDetails(server.config.plugins.indexOf(plugin))
    expect(details.loadMetrics).toHaveLength(2)
    expect(details.loadMetrics[0]!.duration).toBeGreaterThan(0)
    const duration = details.loadMetrics[1]!.duration
    expect(duration).toBeGreaterThan(0)
    const module = (await envContext.getModulesList()).find(module => module.id === id)!
    expect(module.plugins.filter(p => p.name === plugin.name)).toEqual([{ name: plugin.name, transform: duration }])
    expect(module.sourceSize).toBe(source.length)
    expect((await envContext.getModuleTransformInfo(id)).transforms[0]?.result).toBe(source)
  })

  it.each(['memory', 'disk'])('replaces failed load timings when a retry reads a file (%s)', async (storage) => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'vite-file-load-retry-')))
    temporaryDirs.push(dir)
    const id = join(dir, 'entry.js').replace(/\\/g, '/')
    const source = 'export const value = 1'
    writeFileSync(id, source)
    let fail = true
    let now = Date.now()
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now)
    const declined: Plugin = {
      name: 'test:declined-file-load',
      enforce: 'pre',
      load(moduleId) {
        if (moduleId === id)
          now += fail ? 80 : 5
      },
    }
    const failing: Plugin = {
      name: 'test:failing-file-load',
      enforce: 'pre',
      load(moduleId) {
        if (moduleId === id && fail)
          this.error('First load attempt failed')
      },
    }
    try {
      const { server, envContext } = await createInspectServer(new Map(), [declined, failing], {
        filename: storage === 'disk' ? join(dir, 'payloads.bin') : ':memory:',
        maxBatchItems: storage === 'disk' ? 1 : undefined,
      })
      await expect(server.transformRequest(id)).rejects.toThrow('First load attempt failed')
      // Persist the failed snapshot before the retry starts.
      await envContext.getModulesList()
      fail = false
      await server.transformRequest(id)

      const details = await envContext.getPluginDetails(server.config.plugins.indexOf(declined))
      expect(details.loadMetrics.map(call => call.duration)).toEqual([80, 5])
      const module = (await envContext.getModulesList()).find(module => module.id === id)!
      expect(module.plugins.filter(plugin => plugin.name === declined.name)).toEqual([
        { name: declined.name, transform: 5 },
      ])
      expect(module).toMatchObject({ sourceSize: source.length, distSize: source.length, virtual: false })
      const { transforms } = await envContext.getModuleTransformInfo(id)
      expect(transforms[0]).toMatchObject({ name: '__load__', result: source })
      expect(transforms.some(transform => transform.result === '[Error]')).toBe(false)
    }
    finally {
      clock.mockRestore()
    }
  })

  it.each([undefined, null, 'code'] as const)('counts load time with result %s through Vite', async (result) => {
    const id = '/load-timing.js'
    const source = 'export const value = 1'
    const plugin: Plugin = {
      name: 'test:slow-load',
      enforce: 'pre',
      async load(moduleId) {
        if (moduleId !== id)
          return
        await new Promise(resolve => setTimeout(resolve, 20))
        return result === 'code' ? source : result
      },
    }
    const { server, envContext } = await createInspectServer(new Map([[id, source]]), [plugin])
    await server.transformRequest(id)
    const details = await envContext.getPluginDetails(server.config.plugins.indexOf(plugin))
    const duration = details.loadMetrics.reduce((sum, call) => sum + call.duration, 0)
    expect(duration).toBeGreaterThan(0)
    const [module] = await envContext.getModulesList()
    expect(module!.plugins.filter(p => p.name === plugin.name).reduce((sum, p) => sum + (p.transform ?? 0), 0)).toBe(duration)
    expect(module!.sourceSize).toBe(source.length)
    expect(module!.distSize).toBe(source.length)
  })

  it.each([undefined, null])('counts declined loads before Vite reads a file (%s)', async (result) => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'vite-file-load-')))
    temporaryDirs.push(dir)
    const id = join(dir, 'entry.js').replace(/\\/g, '/')
    const source = 'export const value = 1'
    writeFileSync(id, source)
    const plugin: Plugin = {
      name: 'test:declined-file-load',
      enforce: 'pre',
      async load(moduleId) {
        if (moduleId !== id)
          return
        await new Promise(resolve => setTimeout(resolve, 20))
        return result
      },
    }
    const { server, envContext } = await createInspectServer(new Map(), [plugin])
    await server.transformRequest(id)
    const details = await envContext.getPluginDetails(server.config.plugins.indexOf(plugin))
    const duration = details.loadMetrics.reduce((sum, call) => sum + call.duration, 0)
    expect(duration).toBeGreaterThan(0)
    const [module] = await envContext.getModulesList()
    expect(module!.plugins).toContainEqual({ name: plugin.name, transform: duration })
    expect(module!.sourceSize).toBe(source.length)
    expect(module!.virtual).toBe(false)
  })
})
