import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type {
  Environment,
  Plugin,
  ResolvedConfig,
} from 'vite'
import type { ModuleInfoProvider } from './module'
import type {
  ViteInspectStore,
  ViteInspectStoreOptions,
} from './store'
import type {
  ViteInspectModuleInfo,
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
  createGraphModuleIdResolver,
  getModulesList as getEnvironmentModulesList,
  getModuleTransformInfo as getEnvironmentModuleTransformInfo,
} from './module'
import {
  getPluginDetails as getEnvironmentPluginDetails,
  getPluginMetrics as getEnvironmentPluginMetrics,
} from './plugins'
import { createViteInspectStore } from './store'
import {
  normalizeModuleId,
  removeVersionQuery,
  serializePlugin,
} from './utils'

let viteCount = 0

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

  static async create(options: ViteInspectStoreOptions = {}): Promise<ViteInspectContext> {
    return new ViteInspectContext(await createViteInspectStore(options))
  }

  constructor(readonly store: ViteInspectStore) {}

  async close(): Promise<void> {
    await this.store.close()
  }

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
  readonly scope: string
  private pluginCallCount = 0
  private graphModuleIdResolver?: ReturnType<typeof createGraphModuleIdResolver>

  constructor(
    readonly inspectContext: ViteInspectContext,
    readonly viteContext: ViteInspectViteContext,
    readonly env: Environment,
  ) {
    this.scope = `${viteContext.id}:${env.name}`
  }

  recordTransform(
    id: string,
    info: ViteInspectTransformInfo,
    preTransformCode: string,
    plugin?: Plugin,
  ): void {
    this.invalidateGraphModuleIdResolver()
    id = this.normalizeId(id)
    const publicModuleId = this.getPublicModuleId(id)
    const pluginId = this.getPluginId(plugin, info.name)
    const pluginCall = this.createPluginCall({
      type: 'transform',
      pluginId,
      pluginName: info.name,
      module: publicModuleId,
      start: info.start,
      end: info.end,
      unchanged: info.result == null || info.result === preTransformCode,
    })

    this.inspectContext.store.recordTransform(this.scope, id, publicModuleId, {
      ...info,
      plugin_id: pluginId,
    }, preTransformCode, pluginCall)
  }

  recordLoad(
    id: string,
    info: ViteInspectTransformInfo,
    plugin?: Plugin,
  ): void {
    this.invalidateGraphModuleIdResolver()
    id = this.normalizeId(id)
    const publicModuleId = this.getPublicModuleId(id)
    const pluginId = this.getPluginId(plugin, info.name)
    const pluginCall = this.createPluginCall({
      type: 'load',
      pluginId,
      pluginName: info.name,
      module: publicModuleId,
      start: info.start,
      end: info.end,
      unchanged: info.result == null,
    })

    this.inspectContext.store.recordLoad(this.scope, id, publicModuleId, {
      ...info,
      plugin_id: pluginId,
    }, pluginCall)
  }

  recordLoadCall(
    id: string,
    info: ViteInspectTransformInfo,
    plugin?: Plugin,
  ): void {
    id = this.normalizeId(id)
    const publicModuleId = this.getPublicModuleId(id)
    const pluginCall = this.createPluginCall({
      type: 'load',
      pluginId: this.getPluginId(plugin, info.name),
      pluginName: info.name,
      module: publicModuleId,
      start: info.start,
      end: info.end,
      unchanged: true,
    })
    if (!pluginCall)
      return

    this.inspectContext.store.recordPluginCall(this.scope, pluginCall)
  }

  recordResolveId(
    id: string,
    info: ViteInspectResolveIdInfo,
    plugin?: Plugin,
  ): void {
    this.invalidateGraphModuleIdResolver()
    id = this.normalizeId(id)
    const pluginId = this.getPluginId(plugin, info.name)
    const normalizedResult = this.normalizeId(info.result)
    const sourcePublicId = this.getPublicModuleId(id)
    const resultPublicId = this.getPublicModuleId(normalizedResult)
    const pluginCall = this.createPluginCall({
      type: 'resolve',
      pluginId,
      pluginName: info.name,
      module: resultPublicId,
      start: info.start,
      end: info.end,
    })

    this.inspectContext.store.recordResolveId(this.scope, id, sourcePublicId, {
      ...info,
      plugin_id: pluginId,
      result: normalizedResult,
    }, resultPublicId, pluginCall)
  }

  recordResolveIdCall(
    id: string,
    info: Omit<ViteInspectResolveIdInfo, 'result'> & { result?: string | null },
    plugin?: Plugin,
  ): void {
    id = this.normalizeId(id)
    const result = info.result ? this.normalizeId(info.result) : id
    const resultPublicId = this.getPublicModuleId(result)
    const pluginCall = this.createPluginCall({
      type: 'resolve',
      pluginId: this.getPluginId(plugin, info.name),
      pluginName: info.name,
      module: resultPublicId,
      start: info.start,
      end: info.end,
    })
    if (!pluginCall)
      return

    this.inspectContext.store.recordPluginCall(this.scope, pluginCall)
  }

  invalidate(id: string): void {
    this.invalidateGraphModuleIdResolver()
    const normalizedId = this.normalizeId(id)
    const publicModuleId = this.getPublicModuleId(normalizedId)
    this.inspectContext.store.invalidate(this.scope, normalizedId, publicModuleId)
  }

  clearScope(): void {
    this.invalidateGraphModuleIdResolver()
    this.inspectContext.store.clearScope(this.scope)
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

  async getModuleId(id: string): Promise<string> {
    const normalizedId = this.getPublicModuleId(id)
    const moduleId = await this.inspectContext.store.findModuleId(this.scope, normalizedId)
    if (moduleId)
      return moduleId
    if (normalizedId.startsWith('./') || normalizedId.startsWith('../'))
      return resolve(this.getModuleIdBaseRoot(), normalizedId).replace(/\\/g, '/')
    return normalizedId
  }

  getModuleIds(): Promise<string[]> {
    return this.inspectContext.store.getModuleIds(this.scope)
  }

  getPluginId(plugin: Plugin | undefined, name: string): number {
    if (plugin) {
      const index = this.env.getTopLevelConfig().plugins.indexOf(plugin)
      if (index >= 0)
        return index
    }

    return this.env.getTopLevelConfig().plugins.findIndex(item => item.name === name)
  }

  private createPluginCall(options: {
    type: ViteInspectPluginCallInfo['type']
    pluginId: number
    pluginName: string
    module: string
    start: number
    end: number
    unchanged?: boolean
  }): ViteInspectPluginCallInfo | undefined {
    if (options.pluginId < 0)
      return undefined

    return {
      type: options.type,
      id: `${options.type}:${options.pluginId}:${this.pluginCallCount++}`,
      duration: Math.max(0, options.end - options.start),
      plugin_id: options.pluginId,
      plugin_name: options.pluginName,
      module: options.module,
      timestamp_start: options.start,
      timestamp_end: options.end,
      unchanged: options.unchanged,
    }
  }

  async getModulesList(pluginCtx?: ModuleInfoProvider): Promise<ViteInspectModuleInfo[]> {
    const modules = await getEnvironmentModulesList(this, pluginCtx)
    this.graphModuleIdResolver = createGraphModuleIdResolver(
      modules.map(module => module.id),
      this.env.getTopLevelConfig().resolve?.extensions ?? [],
    )
    return modules
  }

  async getGraphModuleIdResolver(): Promise<ReturnType<typeof createGraphModuleIdResolver>> {
    if (!this.graphModuleIdResolver)
      await this.getModulesList()
    return this.graphModuleIdResolver!
  }

  async resolveId(id = ''): Promise<string> {
    id = await this.getModuleId(id)
    if (id.startsWith('./'))
      id = resolve(this.getModuleIdBaseRoot(), id).replace(/\\/g, '/')
    return this.resolveIdRecursive(id)
  }

  async resolveIdRecursive(id: string, seen = new Set<string>()): Promise<string> {
    if (seen.has(id))
      return id
    seen.add(id)
    const resolved = await this.inspectContext.store.getFirstResolveResult(this.scope, id)
    return resolved ? this.resolveIdRecursive(this.normalizeId(resolved), seen) : id
  }

  async getPluginMetrics(): Promise<ViteInspectPluginMetric[]> {
    return getEnvironmentPluginMetrics(this)
  }

  async getModuleTransformInfo(id: string): Promise<ViteInspectModuleTransformInfo> {
    return getEnvironmentModuleTransformInfo(this, id)
  }

  async getPluginDetails(pluginId: number): Promise<ViteInspectPluginDetails> {
    return getEnvironmentPluginDetails(this, pluginId)
  }

  async clearModuleTransform(id: string): Promise<void> {
    await this.clearId(id)
    try {
      if (this.env.mode === 'dev')
        await this.env.transformRequest(id)
    }
    catch {}
  }

  async clearId(moduleId: string): Promise<void> {
    const id = await this.resolveId(moduleId)
    if (!id)
      return

    const moduleGraph = this.env.mode === 'dev' ? this.env.moduleGraph : undefined
    const mod = moduleGraph?.getModuleById(id)
    if (mod)
      moduleGraph?.invalidateModule(mod)
    else
      this.invalidate(id)
  }

  private invalidateGraphModuleIdResolver(): void {
    this.graphModuleIdResolver = undefined
  }
}
