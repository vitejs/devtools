import type { PackageInfo, RolldownAssetInfo } from '../../../shared/types'
import type { AgentAnalysisContext, AnalysisReport, DependencyTraceInput } from '../context'
import { getPackageMeta } from '../../rpc/functions/rolldown-get-packages'
import { createSessionReport, getChunkSize } from '../context'
import { clampDepth, clampLimit } from '../utils'

type ModuleGraph = Map<string, {
  imports?: Array<{ module_id: string }>
  importers?: string[]
}>

function isTargetPackage(pkg: PackageInfo, target: string) {
  return pkg.id === target
    || pkg.name === target
    || `${pkg.name}@${pkg.version}` === target
    || pkg.dir === target
}

function getGraphPaths(
  targets: string[],
  maxDepth: number,
  limit: number,
  getNext: (id: string) => string[],
  options: { reverse?: boolean } = {},
) {
  const paths: string[][] = []
  const queue = targets.map(id => ({ id, path: [id] }))

  while (queue.length && paths.length < limit) {
    const current = queue.shift()!
    const nextIds = getNext(current.id)

    if (!nextIds.length || current.path.length >= maxDepth) {
      paths.push(options.reverse ? current.path.toReversed() : current.path)
      continue
    }

    for (const nextId of nextIds) {
      if (paths.length + queue.length >= limit)
        break
      if (current.path.includes(nextId))
        continue
      queue.push({
        id: nextId,
        path: [...current.path, nextId],
      })
    }
  }

  return paths
}

function getImporterPaths(
  modules: ModuleGraph,
  targets: string[],
  maxDepth: number,
  limit: number,
) {
  return getGraphPaths(
    targets,
    maxDepth,
    limit,
    id => modules.get(id)?.importers?.filter(importer => modules.has(importer)) ?? [],
    { reverse: true },
  )
}

function getImportPaths(
  modules: ModuleGraph,
  targets: string[],
  maxDepth: number,
  limit: number,
) {
  return getGraphPaths(
    targets,
    maxDepth,
    limit,
    id => modules.get(id)?.imports?.map(item => item.module_id).filter(imported => modules.has(imported)) ?? [],
  )
}

function formatTraceAnswer(
  target: DependencyTraceInput['target'],
  targetLabel: string,
  importerPaths: string[][],
  importPaths: string[][],
) {
  if (importerPaths[0])
    return `${target.type} "${targetLabel}" is included through ${importerPaths[0].join(' -> ')}.`
  if (importPaths[0])
    return `${target.type} "${targetLabel}" has an import path: ${importPaths[0].join(' -> ')}.`
  return `${target.type} "${targetLabel}" was found in the bundle, but no graph path was resolved within the requested depth.`
}

export function createDependencyTrace(context: AgentAnalysisContext) {
  const { manager, resolveSession } = context

  return async function dependencyTrace(input: DependencyTraceInput): Promise<AnalysisReport> {
    const tool = 'rolldown:dependency-trace'
    const limit = clampLimit(input?.limit)
    const maxDepth = clampDepth(input?.maxDepth)
    const direction = input?.direction ?? 'importers'
    const resolved = await resolveSession(tool, input?.session)
    if (resolved.report || !resolved.id)
      return resolved.report!

    const reader = await manager.loadAssetSession(resolved.id)
    const packageMeta = getPackageMeta(reader)
    const modules = reader.manager.modules as ModuleGraph
    const chunks = Array.from(reader.manager.chunks.values())
    const chunkMap = new Map(chunks.map(chunk => [chunk.chunk_id, chunk]))
    const target = input?.target

    if (!target) {
      return createSessionReport(tool, resolved.id, resolved.sessions, {
        answer: 'No trace target was provided.',
        limitations: ['Provide target.type and target.id to trace module, package, or asset inclusion.'],
      })
    }

    let matchedModuleIds: string[] = []
    let targetLabel = target.id
    let matchedPackages: PackageInfo[] = []
    let matchedAsset: RolldownAssetInfo | undefined

    if (target.type === 'module') {
      matchedModuleIds = modules.has(target.id)
        ? [target.id]
        : Array.from(modules.keys()).filter(id => id.includes(target.id)).slice(0, limit)
    }
    else if (target.type === 'package') {
      matchedPackages = packageMeta.packages.filter(pkg => isTargetPackage(pkg, target.id))
      matchedModuleIds = Array.from(new Set(matchedPackages.flatMap(pkg => pkg.files.map(file => file.path))))
      targetLabel = matchedPackages[0]?.name ?? target.id
    }
    else if (target.type === 'asset') {
      matchedAsset = reader.manager.assets.get(target.id)
        ?? Array.from(reader.manager.assets.values()).find(asset => asset.filename.includes(target.id))
      const chunk = matchedAsset?.chunk_id == null ? undefined : chunkMap.get(matchedAsset.chunk_id)
      matchedModuleIds = chunk?.entry_module
        ? [chunk.entry_module]
        : chunk?.modules.slice(0, limit) ?? []
      targetLabel = matchedAsset?.filename ?? target.id
    }

    matchedModuleIds = matchedModuleIds.filter(module => modules.has(module)).slice(0, limit)

    if (!matchedModuleIds.length) {
      return createSessionReport(tool, resolved.id, resolved.sessions, {
        answer: `No bundled module was found for ${target.type} "${target.id}".`,
        summary: {
          target,
          packageGraphSupported: packageMeta.isSupported,
        },
        limitations: [
          target.type === 'package'
            ? 'Package tracing requires Rolldown package graph data.'
            : 'The target may be external, removed by bundling, or represented by a different module id.',
        ],
      })
    }

    const importerPaths = direction === 'imports'
      ? []
      : getImporterPaths(modules, matchedModuleIds, maxDepth, limit)
    const importPaths = direction === 'importers'
      ? []
      : getImportPaths(modules, matchedModuleIds, maxDepth, limit)
    const matchedModuleIdSet = new Set(matchedModuleIds)
    const relatedChunks = chunks
      .filter(chunk => chunk.modules.some(module => matchedModuleIdSet.has(module)))
      .map(chunk => ({
        chunkId: chunk.chunk_id,
        name: chunk.name,
        initial: !!chunk.is_initial,
        size: getChunkSize(reader, chunk),
        modules: chunk.modules.length,
      }))
      .slice(0, limit)

    return createSessionReport(tool, resolved.id, resolved.sessions, {
      answer: formatTraceAnswer(target, targetLabel, importerPaths, importPaths),
      summary: {
        target,
        matchedModules: matchedModuleIds,
        matchedPackages: matchedPackages.map(pkg => ({ id: pkg.id, name: pkg.name, version: pkg.version, files: pkg.files.length })),
        matchedAsset: matchedAsset
          ? {
              filename: matchedAsset.filename,
              size: matchedAsset.size,
              chunkId: matchedAsset.chunk_id,
            }
          : undefined,
        importerPaths,
        importPaths,
        relatedChunks,
      },
      limitations: [
        'Graph paths are derived from the recorded module graph and are capped by maxDepth and limit.',
        'A path ending before an entry module can indicate a graph root, an external boundary, or the configured depth limit.',
      ],
    })
  }
}
