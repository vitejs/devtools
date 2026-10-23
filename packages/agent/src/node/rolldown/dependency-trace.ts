import type { RolldownEventsReader } from '@vitejs/devtools-rolldown/node'

type PackageMetaReader = typeof import('@vitejs/devtools-rolldown/node').getPackageMeta

interface TraceInput {
  target: { type: 'module' | 'package' | 'asset', id: string }
  direction: 'importers' | 'imports'
  maxDepth: number
  limit: number
}

interface TracePath {
  modules: string[]
  end: 'entry' | 'root' | 'missing-node' | 'cycle' | 'depth-limit'
}

// Both queue size and edge inspection are bounded even for dense graphs.
const MAX_EDGES = 5000
const MAX_PENDING_PATHS = 1000
const END_RANK: Record<TracePath['end'], number> = {
  'entry': 0,
  'root': 1,
  'depth-limit': 2,
  'cycle': 3,
  'missing-node': 4,
}

export function traceDependency(reader: RolldownEventsReader, input: TraceInput, getPackageMeta: PackageMetaReader) {
  const { target, direction, maxDepth, limit } = input
  const modules = reader.manager.modules
  const entries = new Set(reader.meta?.inputs?.map(input => input.filename) ?? [])
  let targets: string[] = []
  let targetFound: boolean | null = false
  let assetWithoutModuleGraph = false
  if (target.type === 'module') {
    targetFound = modules.has(target.id)
    targets = targetFound ? [target.id] : []
  }
  else if (target.type === 'package') {
    const packageMeta = getPackageMeta(reader)
    const packages = packageMeta.packages.filter(pkg => pkg.id === target.id || pkg.name === target.id || `${pkg.name}@${pkg.version}` === target.id)
    targetFound = packageMeta.isSupported ? packages.length > 0 : null
    targets = [...new Set(packages.flatMap(pkg => pkg.files.map(file => file.path)))].filter(id => modules.has(id))
  }
  else {
    const asset = reader.manager.assets.get(target.id)
    targetFound = !!asset
    targets = asset?.chunk_id == null ? [] : reader.manager.chunks.get(asset.chunk_id)?.modules ?? []
    assetWithoutModuleGraph = !!asset && targets.length === 0
  }

  const queue = targets.slice(0, MAX_PENDING_PATHS).map(id => [id])
  const paths: TracePath[] = []
  let cursor = 0
  let edgesVisited = 0
  let budgetReached = targets.length > MAX_PENDING_PATHS
  const emit = (path: string[], end: TracePath['end']) => {
    paths.push({ modules: direction === 'importers' ? path.toReversed() : path, end })
  }
  // Collect past `limit` so a recorded entry can outrank shorter boundaries.
  while (cursor < queue.length && edgesVisited < MAX_EDGES) {
    const path = queue[cursor++]!
    const id = path.at(-1)!
    const node = modules.get(id)
    const next = direction === 'importers' ? node?.importers ?? [] : node?.imports?.map(item => item.module_id) ?? []
    if (!node) {
      emit(path, 'missing-node')
    }
    else if (direction === 'importers' && entries.has(id)) {
      emit(path, 'entry')
    }
    else if (!next.length) {
      emit(path, 'root')
    }
    else if (path.length - 1 >= maxDepth) {
      emit(path, 'depth-limit')
    }
    else {
      for (const nextId of next) {
        if (edgesVisited >= MAX_EDGES || queue.length - cursor >= MAX_PENDING_PATHS) {
          budgetReached = true
          break
        }
        edgesVisited++
        if (path.includes(nextId))
          emit([...path, nextId], 'cycle')
        else
          queue.push([...path, nextId])
      }
    }
  }
  paths.sort((a, b) => END_RANK[a.end] - END_RANK[b.end] || a.modules.length - b.modules.length)
  return {
    target,
    targetFound,
    direction,
    matchedModules: targets.length,
    paths: paths.slice(0, limit),
    truncated: budgetReached || cursor < queue.length || paths.length > limit || paths.some(path => path.end === 'depth-limit'),
    edgesVisited,
    packageGraphSupported: reader.manager.packageGraphReady,
    notes: [
      'Paths follow the recorded module graph; they do not prove which exports survive tree shaking.',
      'Importer paths are ordered from the entry or boundary toward the target. Returned paths prefer a recorded entry, then a graph boundary, a depth limit, a cycle, or a missing node, with shorter paths first in each group. A root is a graph boundary, not necessarily an application entry.',
      ...assetWithoutModuleGraph ? ['This output file has no recorded module graph. Sourcemaps and other static files stop here.'] : [],
      ...target.type === 'package' && !reader.manager.packageGraphReady ? ['Package graph data is unavailable; package absence cannot be inferred.'] : [],
    ],
  }
}
