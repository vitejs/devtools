import type { ViteInspectEnvironmentContext } from './context'
import type {
  ViteInspectModuleInfo,
  ViteInspectModulePluginMetric,
  ViteInspectModuleTransformInfo,
} from './types'
import { DUMMY_LOAD_PLUGIN_NAME } from './utils'

export interface ModuleInfoProvider {
  getModuleInfo: (id: string) => {
    importedIds?: readonly string[]
    importers?: readonly string[]
  } | null | undefined
}

export async function getModulesList(
  ctx: ViteInspectEnvironmentContext,
  pluginCtx?: ModuleInfoProvider,
): Promise<ViteInspectModuleInfo[]> {
  const moduleGraph = ctx.env.mode === 'dev' ? ctx.env.moduleGraph : undefined
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

  const transformList = await ctx.inspectContext.store.getTransformList(ctx.scope)
  const resolveIdList = await ctx.inspectContext.store.getResolveIdList(ctx.scope)

  const transformsById = transformList.reduce<Record<string, typeof transformList>>((map, transform) => {
    const transforms = map[transform.moduleId] ||= []
    transforms.push(transform)
    return map
  }, {})
  const transformedIdMap = resolveIdList.reduce<Record<string, typeof resolveIdList>>((map, resolveId) => {
    const result = ctx.normalizeId(resolveId.result)
    const resolvedIds = map[result] ||= []
    resolvedIds.push(resolveId)
    return map
  }, {})

  const ids = new Set(Object.keys(transformsById).concat(Object.keys(transformedIdMap)))

  return Array.from(ids).sort().map((id) => {
    let totalTime = 0
    const transforms = transformsById[id] || []
    const transformPlugins: ViteInspectModulePluginMetric[] = transforms
      .filter(transform => transform.hasResult)
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
    const firstTransform = transforms[0]
    const lastTransform = transforms.at(-1)

    return {
      id: ctx.getPublicModuleId(id),
      deps: getDeps(id).map(dep => ctx.getPublicModuleId(dep)),
      importers: getImporters(id).map(importer => ctx.getPublicModuleId(importer)),
      plugins,
      virtual: isVirtual(plugins[0]?.name || '', firstTransform?.name || ''),
      totalTime,
      invokeCount: firstTransform?.invokeCount || 0,
      sourceSize: firstTransform?.hasResult ? firstTransform.resultSize : 0,
      distSize: lastTransform?.hasResult ? lastTransform.resultSize : 0,
    }
  })
}

export async function getPublicGraphModuleIds(ctx: ViteInspectEnvironmentContext): Promise<string[]> {
  return (await ctx.getModuleIds()).map(id => ctx.getPublicModuleId(id))
}

export function createGraphModuleIdResolver(moduleIds: string[], extensions: readonly string[] = []) {
  const moduleIdMap = new Map<string, string | false>()
  const sortedExtensions = extensions.slice().sort((a, b) => b.length - a.length)

  for (const moduleId of moduleIds) {
    addModuleId(moduleIdMap, moduleId, moduleId)

    const extensionlessId = removeResolvedExtension(moduleId, sortedExtensions)
    if (extensionlessId)
      addModuleId(moduleIdMap, extensionlessId, moduleId)
  }

  return (moduleId: string): string | undefined => {
    return moduleIdMap.get(moduleId) || undefined
  }
}

export async function getModuleTransformInfo(
  ctx: ViteInspectEnvironmentContext,
  id: string,
): Promise<ViteInspectModuleTransformInfo> {
  const resolvedId = await ctx.resolveId(id)
  return {
    resolvedId,
    transforms: await ctx.inspectContext.store.getModuleTransforms(ctx.scope, resolvedId),
  }
}

function isVirtual(pluginName: string, transformName: string): boolean {
  return pluginName !== DUMMY_LOAD_PLUGIN_NAME
    && transformName !== 'vite:load-fallback'
    && transformName !== 'vite:build-load-fallback'
}

function addModuleId(moduleIdMap: Map<string, string | false>, key: string, target: string): void {
  const existing = moduleIdMap.get(key)
  if (existing === undefined) {
    moduleIdMap.set(key, target)
  }
  else if (existing !== target) {
    moduleIdMap.set(key, false)
  }
}

function removeResolvedExtension(id: string, extensions: readonly string[]): string | undefined {
  const queryIndex = id.search(/[?#]/)
  const path = queryIndex < 0 ? id : id.slice(0, queryIndex)
  const query = queryIndex < 0 ? '' : id.slice(queryIndex)
  const extension = extensions.find(extension => path.endsWith(extension))

  return extension
    ? `${path.slice(0, -extension.length)}${query}`
    : undefined
}
