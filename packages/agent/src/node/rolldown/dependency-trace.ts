import type { RolldownEventsReader } from '@vitejs/devtools-rolldown/node'
import { getPackageMeta } from '@vitejs/devtools-rolldown/node'

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

export function traceDependency(reader: RolldownEventsReader, input: TraceInput) {
  const { target, direction, maxDepth, limit } = input
  const modules = reader.manager.modules
  const entries = new Set(reader.meta?.inputs?.map(input => input.filename) ?? [])
  let targets: string[] = []
  let targetFound: boolean | null = false
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
  }

  const queue = targets.slice(0, MAX_PENDING_PATHS).map(id => [id])
  const paths: TracePath[] = []
  let cursor = 0
  let edgesVisited = 0
  let budgetReached = targets.length > MAX_PENDING_PATHS
  const emit = (path: string[], end: TracePath['end']) => {
    paths.push({ modules: direction === 'importers' ? path.toReversed() : path, end })
  }
  while (cursor < queue.length && paths.length < limit && edgesVisited < MAX_EDGES) {
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
        if (paths.length >= limit || edgesVisited >= MAX_EDGES || queue.length - cursor >= MAX_PENDING_PATHS) {
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
  return {
    target,
    targetFound,
    direction,
    matchedModules: targets.length,
    paths,
    truncated: budgetReached || cursor < queue.length || paths.some(path => path.end === 'depth-limit'),
    edgesVisited,
    packageGraphSupported: reader.manager.packageGraphReady,
    notes: [
      'Paths follow the recorded module graph; they do not prove which exports survive tree shaking.',
      'Importer paths are ordered from the entry or boundary toward the target. A root is a graph boundary, not necessarily an application entry.',
      ...target.type === 'package' && !reader.manager.packageGraphReady ? ['Package graph data is unavailable; package absence cannot be inferred.'] : [],
    ],
  }
}
