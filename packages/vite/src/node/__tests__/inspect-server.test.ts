import type { Environment, Plugin, ViteDevServer } from 'vite'
import type { ViteInspectEnvironmentContext } from '../inspect/context'
import type { ViteInspectStoreOptions } from '../inspect/store'
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

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(async ({ server, inspectContext }) => {
    await server.close()
    await inspectContext.close()
  }))
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
})
