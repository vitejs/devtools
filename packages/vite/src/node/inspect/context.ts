import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type {
  Environment,
  Plugin,
  ResolvedConfig,
} from 'vite'
import type {
  ViteInspectModuleInfo,
  ViteInspectModulePluginMetric,
  ViteInspectModuleTransformInfo,
  ViteInspectPluginCallInfo,
  ViteInspectPluginDetails,
  ViteInspectPluginMetric,
  ViteInspectQuery,
  ViteInspectResolveIdInfo,
  ViteInspectServerMetrics,
  ViteInspectTransformInfo,
} from './types'
import { resolve } from 'node:path'
import { createFilter } from 'vite'
import { diagnostics } from '../diagnostics'
import {
  DUMMY_LOAD_PLUGIN_NAME,
  getUtf8Size,
  normalizeModuleId,
  removeVersionQuery,
  serializePlugin,
} from './utils'

let viteCount = 0

interface ModuleInfoProvider {
  getModuleInfo: (id: string) => {
    importedIds?: readonly string[]
    importers?: readonly string[]
  } | null | undefined
}

const contextMap = new WeakMap<ViteDevToolsNodeContext, ViteInspectContext>()

export function setViteInspectContext(devtoolsCtx: ViteDevToolsNodeContext, ctx: ViteInspectContext): void {
  contextMap.set(devtoolsCtx, ctx)
}

export function getViteInspectContext(devtoolsCtx: ViteDevToolsNodeContext): ViteInspectContext {
  const ctx = contextMap.get(devtoolsCtx)
  if (!ctx)
    throw diagnostics.VDT0001()
  return ctx
}

export class ViteInspectContext {
  readonly filter = createFilter()
  readonly configToInstances = new Map<ResolvedConfig, ViteInspectViteContext>()
  readonly idToInstances = new Map<string, ViteInspectViteContext>()

  getMetadata() {
    return {
      instances: Array.from(this.idToInstances.values(), vite => ({
        root: vite.config.root,
        vite: vite.id,
        plugins: vite.config.plugins.map(plugin => serializePlugin(plugin)),
        environments: [...new Set([...vite.environmentNames, ...vite.environments.keys()])],
        environmentPlugins: Object.fromEntries(Array.from(vite.environments.entries(), ([name, env]) => {
          const plugins = env.env.getTopLevelConfig().plugins
          return [name, plugins.map(plugin => vite.config.plugins.indexOf(plugin))]
        })),
      })),
      embedded: false,
    }
  }

  getViteContext(configOrId: ResolvedConfig | string): ViteInspectViteContext {
    if (typeof configOrId === 'string') {
      const vite = this.idToInstances.get(configOrId)
      if (!vite)
        throw diagnostics.VDT0002({ target: 'Vite inspect instances', id: configOrId })
      return vite
    }

    const existing = this.configToInstances.get(configOrId)
    if (existing)
      return existing

    const id = `vite${++viteCount}`
    const vite = new ViteInspectViteContext(id, this, configOrId)
    this.idToInstances.set(id, vite)
    this.configToInstances.set(configOrId, vite)
    return vite
  }

  getEnvContext(env: Environment | undefined): ViteInspectEnvironmentContext | undefined {
    if (!env)
      return undefined
    return this.getViteContext(env.getTopLevelConfig()).getEnvContext(env)
  }

  queryEnv(query: ViteInspectQuery): ViteInspectEnvironmentContext {
    return this.getViteContext(query.vite).getEnvContext(query.env)
  }
}

export class ViteInspectViteContext {
  readonly environmentNames = new Set<string>()
  readonly environments = new Map<string, ViteInspectEnvironmentContext>()
  readonly data: {
    serverMetrics: ViteInspectServerMetrics
  } = {
    serverMetrics: {
      middleware: {},
    },
  }

  constructor(
    readonly id: string,
    readonly context: ViteInspectContext,
    readonly config: ResolvedConfig,
  ) {}

  registerEnvironmentNames(names: Iterable<string>): void {
    for (const name of names)
      this.environmentNames.add(name)
  }

  getEnvContext(env: Environment | string): ViteInspectEnvironmentContext {
    if (typeof env === 'string') {
      const envContext = this.environments.get(env)
      if (!envContext)
        throw diagnostics.VDT0002({ target: `Vite inspect environments for ${this.id}`, id: env })
      return envContext
    }

    if (env.getTopLevelConfig() !== this.config) {
      throw diagnostics.VDT0002({
        target: 'the current Vite config environments',
        id: env.name,
      })
    }

    this.environmentNames.add(env.name)
    let envContext = this.environments.get(env.name)
    if (!envContext) {
      envContext = new ViteInspectEnvironmentContext(this.context, this, env)
      this.environments.set(env.name, envContext)
    }
    return envContext
  }
}

export class ViteInspectEnvironmentContext {
  readonly data: {
    transform: Record<string, ViteInspectTransformInfo[]>
    resolveId: Record<string, ViteInspectResolveIdInfo[]>
    pluginCalls: Record<number, ViteInspectPluginCallInfo[]>
    transformCounter: Record<string, number>
  } = {
    transform: {},
    resolveId: {},
    pluginCalls: {},
    transformCounter: {},
  }

  private pluginCallCount = 0

  constructor(
    readonly contextMain: ViteInspectContext,
    readonly contextVite: ViteInspectViteContext,
    readonly env: Environment,
  ) {}

  recordTransform(id: string, info: ViteInspectTransformInfo, preTransformCode: string, plugin?: Plugin): void {
    id = this.normalizeId(id)
    const pluginId = this.getPluginId(plugin, info.name)

    let transforms = this.data.transform[id]
    if (!transforms || !transforms.some(transform => transform.result != null)) {
      transforms = [{
        name: DUMMY_LOAD_PLUGIN_NAME,
        result: preTransformCode,
        start: info.start,
        end: info.start,
        sourcemaps: info.sourcemaps,
      }]
      this.data.transform[id] = transforms
      this.data.transformCounter[id] = (this.data.transformCounter[id] || 0) + 1
    }

    transforms.push({
      ...info,
      plugin_id: pluginId,
    })

    this.recordPluginCall({
      type: 'transform',
      pluginId,
      pluginName: info.name,
      module: this.getPublicModuleId(id),
      start: info.start,
      end: info.end,
      unchanged: info.result == null || info.result === preTransformCode,
    })
  }

  recordLoad(id: string, info: ViteInspectTransformInfo, plugin?: Plugin): void {
    id = this.normalizeId(id)
    const pluginId = this.getPluginId(plugin, info.name)
    this.data.transform[id] = [{
      ...info,
      plugin_id: pluginId,
    }]
    this.data.transformCounter[id] = (this.data.transformCounter[id] || 0) + 1

    this.recordPluginCall({
      type: 'load',
      pluginId,
      pluginName: info.name,
      module: this.getPublicModuleId(id),
      start: info.start,
      end: info.end,
      unchanged: info.result == null,
    })
  }

  recordLoadCall(id: string, info: ViteInspectTransformInfo, plugin?: Plugin): void {
    id = this.normalizeId(id)
    this.recordPluginCall({
      type: 'load',
      pluginId: this.getPluginId(plugin, info.name),
      pluginName: info.name,
      module: this.getPublicModuleId(id),
      start: info.start,
      end: info.end,
      unchanged: true,
    })
  }

  recordResolveId(id: string, info: ViteInspectResolveIdInfo, plugin?: Plugin): void {
    id = this.normalizeId(id)
    const pluginId = this.getPluginId(plugin, info.name)
    const normalizedResult = this.normalizeId(info.result)
    const resolveIds = this.data.resolveId[id] ||= []
    resolveIds.push({
      ...info,
      plugin_id: pluginId,
      result: normalizedResult,
    })

    this.recordPluginCall({
      type: 'resolve',
      pluginId,
      pluginName: info.name,
      module: this.getPublicModuleId(normalizedResult),
      start: info.start,
      end: info.end,
    })
  }

  recordResolveIdCall(id: string, info: Omit<ViteInspectResolveIdInfo, 'result'> & { result?: string | null }, plugin?: Plugin): void {
    id = this.normalizeId(id)
    const result = info.result ? this.normalizeId(info.result) : id
    this.recordPluginCall({
      type: 'resolve',
      pluginId: this.getPluginId(plugin, info.name),
      pluginName: info.name,
      module: this.getPublicModuleId(result),
      start: info.start,
      end: info.end,
    })
  }

  invalidate(id: string): void {
    const normalizedId = this.normalizeId(id)
    const invalidatedIds = new Set([normalizedId])
    const invalidatedPublicIds = new Set([this.getPublicModuleId(normalizedId)])

    for (const rawId of this.getRawModuleIds()) {
      const publicId = this.getPublicModuleId(rawId)
      if (invalidatedPublicIds.has(publicId)) {
        invalidatedIds.add(rawId)
        invalidatedPublicIds.add(publicId)
      }
    }

    for (const [sourceId, resolveIds] of Object.entries(this.data.resolveId)) {
      if (this.matchesInvalidatedModule(sourceId, invalidatedIds, invalidatedPublicIds)) {
        invalidatedIds.add(this.normalizeId(sourceId))
        invalidatedPublicIds.add(this.getPublicModuleId(sourceId))
      }

      for (const resolveId of resolveIds) {
        if (this.matchesInvalidatedModule(resolveId.result, invalidatedIds, invalidatedPublicIds)) {
          const normalizedResult = this.normalizeId(resolveId.result)
          invalidatedIds.add(normalizedResult)
          invalidatedPublicIds.add(this.getPublicModuleId(normalizedResult))
        }
      }
    }

    for (const rawId of invalidatedIds) {
      delete this.data.transform[rawId]
      delete this.data.transformCounter[rawId]
    }

    for (const [sourceId, resolveIds] of Object.entries(this.data.resolveId)) {
      const remaining = resolveIds.filter((resolveId) => {
        return !this.matchesInvalidatedModule(sourceId, invalidatedIds, invalidatedPublicIds)
          && !this.matchesInvalidatedModule(resolveId.result, invalidatedIds, invalidatedPublicIds)
      })

      if (remaining.length)
        this.data.resolveId[sourceId] = remaining
      else
        delete this.data.resolveId[sourceId]
    }

    for (const [pluginId, calls] of Object.entries(this.data.pluginCalls)) {
      const remaining = calls.filter(call => !invalidatedPublicIds.has(call.module))
      if (remaining.length)
        this.data.pluginCalls[Number(pluginId)] = remaining
      else
        delete this.data.pluginCalls[Number(pluginId)]
    }
  }

  private matchesInvalidatedModule(id: string, invalidatedIds: Set<string>, invalidatedPublicIds: Set<string>): boolean {
    const normalizedId = this.normalizeId(id)
    return invalidatedIds.has(normalizedId)
      || invalidatedPublicIds.has(this.getPublicModuleId(normalizedId))
  }

  normalizeId(id: string): string {
    return removeVersionQuery(id)
  }

  getModuleIdBaseRoot(): string {
    return this.env.getTopLevelConfig().root
  }

  getPublicModuleId(id: string): string {
    return normalizeModuleId(this.normalizeId(id), this.getModuleIdBaseRoot())
  }

  getRawModuleId(id: string): string {
    const normalizedId = this.getPublicModuleId(id)
    for (const rawId of this.getRawModuleIds()) {
      if (this.getPublicModuleId(rawId) === normalizedId)
        return rawId
    }
    if (normalizedId.startsWith('./') || normalizedId.startsWith('../'))
      return resolve(this.getModuleIdBaseRoot(), normalizedId).replace(/\\/g, '/')
    return normalizedId
  }

  getRawModuleIds(): string[] {
    const ids = new Set(Object.keys(this.data.transform))
    for (const resolveIds of Object.values(this.data.resolveId)) {
      for (const id of resolveIds)
        ids.add(this.normalizeId(id.result))
    }
    return Array.from(ids)
  }

  getPluginId(plugin: Plugin | undefined, name: string): number {
    if (plugin) {
      const index = this.env.getTopLevelConfig().plugins.indexOf(plugin)
      if (index >= 0)
        return index
    }

    return this.env.getTopLevelConfig().plugins.findIndex(item => item.name === name)
  }

  recordPluginCall(options: {
    type: ViteInspectPluginCallInfo['type']
    pluginId: number
    pluginName: string
    module: string
    start: number
    end: number
    unchanged?: boolean
  }): void {
    if (options.pluginId < 0)
      return

    const calls = this.data.pluginCalls[options.pluginId] ||= []
    calls.push({
      type: options.type,
      id: `${options.type}:${options.pluginId}:${this.pluginCallCount++}`,
      duration: Math.max(0, options.end - options.start),
      plugin_id: options.pluginId,
      plugin_name: options.pluginName,
      module: options.module,
      timestamp_start: options.start,
      timestamp_end: options.end,
      unchanged: options.unchanged,
    })
  }

  getModulesList(pluginCtx?: ModuleInfoProvider): ViteInspectModuleInfo[] {
    const moduleGraph = this.env.mode === 'dev' ? this.env.moduleGraph : undefined
    const getDeps = moduleGraph
      ? (id: string) => Array.from(moduleGraph.getModuleById(id)?.importedModules || []).map(module => module.id || '').filter(Boolean)
      : pluginCtx
        ? (id: string) => Array.from(pluginCtx.getModuleInfo(id)?.importedIds || [])
        : () => []
    const getImporters = moduleGraph
      ? (id: string) => Array.from(moduleGraph.getModuleById(id)?.importers || []).map(module => module.id || '').filter(Boolean)
      : pluginCtx
        ? (id: string) => Array.from(pluginCtx.getModuleInfo(id)?.importers || [])
        : () => []

    const transformedIdMap = Object.values(this.data.resolveId).reduce<Record<string, ViteInspectResolveIdInfo[]>>((map, ids) => {
      ids.forEach((id) => {
        const result = this.normalizeId(id.result)
        const resolvedIds = map[result] ||= []
        resolvedIds.push(id)
      })
      return map
    }, {})

    const ids = new Set(Object.keys(this.data.transform).concat(Object.keys(transformedIdMap)))

    return Array.from(ids).sort().map((id) => {
      let totalTime = 0
      const transformPlugins: ViteInspectModulePluginMetric[] = (this.data.transform[id] || [])
        .filter(transform => transform.result != null)
        .map((transform) => {
          const delta = transform.end - transform.start
          totalTime += delta
          return {
            name: transform.name,
            transform: delta,
          }
        })
      const resolveIdPlugins: ViteInspectModulePluginMetric[] = (transformedIdMap[id] || []).map(resolveId => ({
        name: resolveId.name,
        resolveId: resolveId.end - resolveId.start,
      }))
      const plugins = transformPlugins.concat(resolveIdPlugins)

      return {
        id: this.getPublicModuleId(id),
        deps: getDeps(id).map(dep => this.getPublicModuleId(dep)),
        importers: getImporters(id).map(importer => this.getPublicModuleId(importer)),
        plugins,
        virtual: isVirtual(plugins[0]?.name || '', this.data.transform[id]?.[0]?.name || ''),
        totalTime,
        invokeCount: this.data.transformCounter[id] || 0,
        sourceSize: getUtf8Size(this.data.transform[id]?.[0]?.result),
        distSize: getUtf8Size(this.data.transform[id]?.at(-1)?.result),
      }
    })
  }

  resolveId(id = ''): string {
    id = this.getRawModuleId(id)
    if (id.startsWith('./'))
      id = resolve(this.getModuleIdBaseRoot(), id).replace(/\\/g, '/')
    return this.resolveIdRecursive(id)
  }

  resolveIdRecursive(id: string): string {
    const resolved = this.data.resolveId[id]?.[0]?.result
    return resolved ? this.resolveIdRecursive(this.normalizeId(resolved)) : id
  }

  getPluginMetrics(): ViteInspectPluginMetric[] {
    const map: Record<string, ViteInspectPluginMetric> = {}
    const defaultMetricInfo = () => ({
      transform: {
        invokeCount: 0,
        totalTime: 0,
      },
      resolveId: {
        invokeCount: 0,
        totalTime: 0,
      },
    })

    this.env.getTopLevelConfig().plugins.forEach((plugin: Plugin, pluginId) => {
      map[pluginId] = {
        ...defaultMetricInfo(),
        name: plugin.name,
        plugin_id: pluginId,
        enforce: plugin.enforce,
      }
    })

    Object.values(this.data.transform).forEach((transformInfos) => {
      transformInfos.forEach(({ name, plugin_id: pluginId, start, end }) => {
        if (name === DUMMY_LOAD_PLUGIN_NAME)
          return
        const key = pluginId == null || pluginId < 0 ? name : String(pluginId)
        map[key] ||= {
          ...defaultMetricInfo(),
          name,
          plugin_id: pluginId,
        }
        map[key].transform.totalTime += end - start
        map[key].transform.invokeCount += 1
      })
    })

    Object.values(this.data.resolveId).forEach((resolveIdInfos) => {
      resolveIdInfos.forEach(({ name, plugin_id: pluginId, start, end }) => {
        const key = pluginId == null || pluginId < 0 ? name : String(pluginId)
        map[key] ||= {
          ...defaultMetricInfo(),
          name,
          plugin_id: pluginId,
        }
        map[key].resolveId.totalTime += end - start
        map[key].resolveId.invokeCount += 1
      })
    })

    return Object.values(map).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name))
  }

  async getModuleTransformInfo(id: string): Promise<ViteInspectModuleTransformInfo> {
    const resolvedId = this.resolveId(id)
    return {
      resolvedId,
      transforms: this.data.transform[resolvedId] || [],
    }
  }

  getPluginDetails(pluginId: number): ViteInspectPluginDetails {
    const plugin = this.env.getTopLevelConfig().plugins[pluginId]
    const calls = this.data.pluginCalls[pluginId] ?? []
    return {
      plugin_name: plugin?.name ?? calls[0]?.plugin_name ?? '',
      plugin_id: pluginId,
      calls,
      resolveIdMetrics: calls.filter(call => call.type === 'resolve'),
      loadMetrics: calls.filter(call => call.type === 'load'),
      transformMetrics: calls.filter(call => call.type === 'transform'),
    }
  }

  async clearModuleTransform(id: string): Promise<void> {
    this.clearId(id)
    try {
      if (this.env.mode === 'dev')
        await this.env.transformRequest(id)
    }
    catch {}
  }

  clearId(rawId: string): void {
    const id = this.resolveId(rawId)
    if (!id)
      return

    const moduleGraph = this.env.mode === 'dev' ? this.env.moduleGraph : undefined
    const mod = moduleGraph?.getModuleById(id)
    if (mod)
      moduleGraph?.invalidateModule(mod)
    this.invalidate(id)
  }
}

function isVirtual(pluginName: string, transformName: string): boolean {
  return pluginName !== DUMMY_LOAD_PLUGIN_NAME
    && transformName !== 'vite:load-fallback'
    && transformName !== 'vite:build-load-fallback'
}
