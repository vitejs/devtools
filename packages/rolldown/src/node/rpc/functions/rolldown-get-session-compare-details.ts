import type { PluginItem } from '@rolldown/debug'
import type {
  PackageInfo,
  RolldownAssetInfo,
  RolldownChunkInfo,
  SessionCompareAssetDiff,
  SessionCompareChangeStatus,
  SessionCompareChunkDiff,
  SessionCompareDetails,
  SessionCompareMetricValue,
  SessionComparePackageDiff,
  SessionComparePluginDiff,
} from '../../../shared/types'
import type { RolldownEventsReader } from '../../rolldown/events-reader'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { extname } from 'pathe'
import { getLogsManager } from '../utils'
import { getPackageMeta } from './rolldown-get-packages'

interface SessionCompareSource {
  reader: RolldownEventsReader
  assets: RolldownAssetInfo[]
  chunks: RolldownChunkInfo[]
  packages: PackageInfo[]
}

interface PluginProfile {
  key: string
  name: string
  pluginId: number
  duration: number
  calls: number
  resolveDuration: number
  loadDuration: number
  transformDuration: number
}

interface PackageProfile {
  key: string
  name: string
  version: string
  type?: PackageInfo['type']
  duplicated: boolean
  transformedCodeSize: number
  files: PackageInfo['files']
}

function createMetric(previous: number, current: number): SessionCompareMetricValue {
  const delta = current - previous

  return {
    previous,
    current,
    delta,
    deltaRatio: previous === 0 ? (current === 0 ? 0 : null) : delta / previous,
  }
}

function getStatus(previous: unknown, current: unknown, changed: boolean): SessionCompareChangeStatus {
  if (!previous)
    return 'added'
  if (!current)
    return 'removed'
  return changed ? 'changed' : 'unchanged'
}

function compareMaps<TPrevious, TCurrent, TResult>(
  previous: Map<string, TPrevious>,
  current: Map<string, TCurrent>,
  map: (key: string, previousItem: TPrevious | undefined, currentItem: TCurrent | undefined) => TResult,
) {
  return Array.from(new Set([...previous.keys(), ...current.keys()]))
    .map(key => map(key, previous.get(key), current.get(key)))
}

function sortByDeltaImpact<T extends { delta: number, name?: string, key: string }>(items: T[]) {
  return items.toSorted((a, b) => {
    const impact = Math.abs(b.delta) - Math.abs(a.delta)
    if (impact)
      return impact
    return (a.name || a.key).localeCompare(b.name || b.key)
  })
}

function createUniqueMap<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Map<string, number>()
  const map = new Map<string, T>()

  for (const item of items) {
    const baseKey = getKey(item)
    const count = seen.get(baseKey) ?? 0
    seen.set(baseKey, count + 1)
    map.set(count === 0 ? baseKey : `${baseKey}#${count + 1}`, item)
  }

  return map
}

function normalizeAssetFilename(filename: string) {
  return filename
    .replace(/([._-])[a-f0-9]{8,}(?=\.)/gi, '$1[hash]')
    .replace(/([._-])(?=[\w-]{8,}\.)(?=[\w-]*\d)[\w-]{8,}(?=\.)/g, '$1[hash]')
}

function getAssetType(filename: string) {
  return extname(filename).replace(/^\./, '') || 'asset'
}

function getAssetKey(asset: RolldownAssetInfo, chunks: Map<number, RolldownChunkInfo>) {
  const type = getAssetType(asset.filename)
  const chunk = asset.chunk_id == null ? undefined : chunks.get(asset.chunk_id)

  if (chunk) {
    return `chunk:${chunk.name || chunk.entry_module || normalizeAssetFilename(asset.filename)}:${type}`
  }

  return `asset:${normalizeAssetFilename(asset.filename)}`
}

function getAssetScope(asset: RolldownAssetInfo | undefined, chunks: Map<number, RolldownChunkInfo>): SessionCompareAssetDiff['scope'] {
  if (!asset || asset.chunk_id == null)
    return 'static'
  return chunks.get(asset.chunk_id)?.is_initial ? 'initial' : 'async'
}

function getChunkSize(reader: RolldownEventsReader, chunk: RolldownChunkInfo | undefined) {
  if (!chunk)
    return 0
  const asset = reader.manager.chunkAssetMap.get(chunk.chunk_id)
  if (asset)
    return asset.size

  return chunk.modules.reduce((total, id) => {
    const transforms = reader.manager.modules.get(id)?.build_metrics?.transforms
    return total + (transforms?.at(-1)?.transformed_code_size ?? 0)
  }, 0)
}

function getChunkKey(chunk: RolldownChunkInfo) {
  if (chunk.name)
    return `name:${chunk.name}`
  if (chunk.entry_module)
    return `entry:${chunk.entry_module}`
  return `modules:${chunk.modules.toSorted((a, b) => a.localeCompare(b)).join('\0')}`
}

function getPackageImporters(pkg: { files: PackageInfo['files'] } | undefined) {
  return pkg?.files.reduce((total, file) => total + file.importers.length, 0) ?? 0
}

function mergePackageVersions(versions: Set<string>) {
  return Array.from(versions)
    .filter(version => version && version !== '(unknown)')
    .toSorted((a, b) => a.localeCompare(b))
    .join(', ')
}

function createPackageProfiles(packages: PackageInfo[]) {
  const profiles = new Map<string, PackageProfile>()
  const versionsByName = new Map<string, Set<string>>()

  for (const pkg of packages) {
    const key = pkg.name
    const versions = versionsByName.get(key) ?? new Set<string>()
    versions.add(pkg.version)
    versionsByName.set(key, versions)

    const existing = profiles.get(key)
    if (!existing) {
      profiles.set(key, {
        key,
        name: pkg.name,
        version: pkg.version,
        type: pkg.type,
        duplicated: pkg.duplicated ?? false,
        transformedCodeSize: pkg.transformedCodeSize,
        files: pkg.files,
      })
      continue
    }

    profiles.set(key, {
      ...existing,
      version: mergePackageVersions(versions),
      type: existing.type === pkg.type ? existing.type : undefined,
      duplicated: true,
      transformedCodeSize: existing.transformedCodeSize + pkg.transformedCodeSize,
      files: [...existing.files, ...pkg.files],
    })
  }

  for (const [key, profile] of profiles) {
    profiles.set(key, {
      ...profile,
      version: mergePackageVersions(versionsByName.get(key) ?? new Set([profile.version])) || profile.version,
      duplicated: profile.duplicated || (versionsByName.get(key)?.size ?? 0) > 1,
    })
  }

  return profiles
}

async function createPluginProfiles(reader: RolldownEventsReader) {
  const seen = new Map<string, number>()
  const profiles = new Map<string, PluginProfile>()
  const pluginSummaries = await reader.readPluginBuildMetricsSummary()

  for (const plugin of reader.meta?.plugins ?? []) {
    const key = getPluginKey(plugin, seen)
    const metrics = reader.manager.plugin_build_metrics.get(plugin.plugin_id)
    const calls = metrics?.calls ?? []
    const summary = pluginSummaries.get(plugin.plugin_id)

    profiles.set(key, {
      key,
      name: plugin.name,
      pluginId: plugin.plugin_id,
      duration: summary?.total.duration ?? calls.reduce((total, call) => total + call.duration, 0),
      calls: summary?.total.count ?? calls.length,
      resolveDuration: summary?.resolve.duration ?? calls.filter(call => call.type === 'resolve').reduce((total, call) => total + call.duration, 0),
      loadDuration: summary?.load.duration ?? calls.filter(call => call.type === 'load').reduce((total, call) => total + call.duration, 0),
      transformDuration: summary?.transform.duration ?? calls.filter(call => call.type === 'transform').reduce((total, call) => total + call.duration, 0),
    })
  }

  return profiles
}

function getPluginKey(plugin: PluginItem, seen: Map<string, number>) {
  const count = seen.get(plugin.name) ?? 0
  seen.set(plugin.name, count + 1)
  return count === 0 ? plugin.name : `${plugin.name}#${count + 1}`
}

function createCompareSource(reader: RolldownEventsReader): SessionCompareSource {
  const chunks = Array.from(reader.manager.chunks.values()).map(chunk => ({
    ...chunk,
    asset: reader.manager.chunkAssetMap.get(chunk.chunk_id),
  }))

  return {
    reader,
    assets: Array.from(reader.manager.assets.values()),
    chunks,
    packages: getPackageMeta(reader).packages,
  }
}

function compareAssets(previous: SessionCompareSource, current: SessionCompareSource): SessionCompareAssetDiff[] {
  const previousChunks = new Map(previous.chunks.map(chunk => [chunk.chunk_id, chunk]))
  const currentChunks = new Map(current.chunks.map(chunk => [chunk.chunk_id, chunk]))
  const previousAssets = createUniqueMap(previous.assets, asset => getAssetKey(asset, previousChunks))
  const currentAssets = createUniqueMap(current.assets, asset => getAssetKey(asset, currentChunks))

  return sortByDeltaImpact(compareMaps(previousAssets, currentAssets, (key, previousAsset, currentAsset) => {
    const previousSize = previousAsset?.size ?? 0
    const currentSize = currentAsset?.size ?? 0
    const metric = createMetric(previousSize, currentSize)
    const chunk = currentAsset?.chunk_id != null
      ? currentChunks.get(currentAsset.chunk_id)
      : previousAsset?.chunk_id != null
        ? previousChunks.get(previousAsset.chunk_id)
        : undefined

    return {
      key,
      status: getStatus(previousAsset, currentAsset, previousSize !== currentSize),
      name: currentAsset?.filename ?? previousAsset?.filename ?? key,
      previousFilename: previousAsset?.filename,
      currentFilename: currentAsset?.filename,
      type: getAssetType(currentAsset?.filename ?? previousAsset?.filename ?? ''),
      scope: getAssetScope(currentAsset ?? previousAsset, currentAsset ? currentChunks : previousChunks),
      chunkName: chunk?.name ?? undefined,
      ...metric,
    }
  }))
}

function compareChunks(previous: SessionCompareSource, current: SessionCompareSource): SessionCompareChunkDiff[] {
  const previousChunks = createUniqueMap(previous.chunks, getChunkKey)
  const currentChunks = createUniqueMap(current.chunks, getChunkKey)

  return sortByDeltaImpact(compareMaps(previousChunks, currentChunks, (key, previousChunk, currentChunk) => {
    const previousSize = getChunkSize(previous.reader, previousChunk)
    const currentSize = getChunkSize(current.reader, currentChunk)
    const metric = createMetric(previousSize, currentSize)
    const previousModules = previousChunk?.modules.length ?? 0
    const currentModules = currentChunk?.modules.length ?? 0
    const previousImports = previousChunk?.imports.length ?? 0
    const currentImports = currentChunk?.imports.length ?? 0
    const previousInitial = previousChunk?.is_initial ?? false
    const currentInitial = currentChunk?.is_initial ?? false

    return {
      key,
      status: getStatus(
        previousChunk,
        currentChunk,
        previousSize !== currentSize
        || previousModules !== currentModules
        || previousImports !== currentImports
        || previousInitial !== currentInitial,
      ),
      name: currentChunk?.name ?? previousChunk?.name ?? currentChunk?.entry_module ?? previousChunk?.entry_module ?? key,
      reason: currentChunk?.reason ?? previousChunk?.reason,
      previousChunkId: previousChunk?.chunk_id,
      currentChunkId: currentChunk?.chunk_id,
      previousModules,
      currentModules,
      previousImports,
      currentImports,
      previousInitial,
      currentInitial,
      ...metric,
    }
  }))
}

function comparePackages(previous: SessionCompareSource, current: SessionCompareSource): SessionComparePackageDiff[] {
  const previousPackages = createPackageProfiles(previous.packages)
  const currentPackages = createPackageProfiles(current.packages)

  return sortByDeltaImpact(compareMaps(previousPackages, currentPackages, (key, previousPackage, currentPackage) => {
    const previousSize = previousPackage?.transformedCodeSize ?? 0
    const currentSize = currentPackage?.transformedCodeSize ?? 0
    const previousFiles = previousPackage?.files.length ?? 0
    const currentFiles = currentPackage?.files.length ?? 0
    const previousImporters = getPackageImporters(previousPackage)
    const currentImporters = getPackageImporters(currentPackage)
    const previousDuplicated = previousPackage?.duplicated ?? false
    const currentDuplicated = currentPackage?.duplicated ?? false
    const metric = createMetric(previousSize, currentSize)

    return {
      key,
      status: getStatus(
        previousPackage,
        currentPackage,
        previousSize !== currentSize
        || previousFiles !== currentFiles
        || previousImporters !== currentImporters
        || previousDuplicated !== currentDuplicated
        || previousPackage?.type !== currentPackage?.type,
      ),
      name: currentPackage?.name ?? previousPackage?.name ?? key,
      version: currentPackage?.version ?? previousPackage?.version ?? '',
      previousVersion: previousPackage?.version,
      currentVersion: currentPackage?.version,
      previousType: previousPackage?.type,
      currentType: currentPackage?.type,
      previousDuplicated,
      currentDuplicated,
      previousFiles,
      currentFiles,
      previousImporters,
      currentImporters,
      ...metric,
    }
  }))
}

async function comparePlugins(previous: SessionCompareSource, current: SessionCompareSource): Promise<SessionComparePluginDiff[]> {
  const [previousPlugins, currentPlugins] = await Promise.all([
    createPluginProfiles(previous.reader),
    createPluginProfiles(current.reader),
  ])

  return sortByDeltaImpact(compareMaps(previousPlugins, currentPlugins, (key, previousPlugin, currentPlugin) => {
    const previousDuration = previousPlugin?.duration ?? 0
    const currentDuration = currentPlugin?.duration ?? 0
    const metric = createMetric(previousDuration, currentDuration)

    return {
      key,
      status: getStatus(
        previousPlugin,
        currentPlugin,
        previousDuration !== currentDuration
        || previousPlugin?.calls !== currentPlugin?.calls
        || previousPlugin?.resolveDuration !== currentPlugin?.resolveDuration
        || previousPlugin?.loadDuration !== currentPlugin?.loadDuration
        || previousPlugin?.transformDuration !== currentPlugin?.transformDuration,
      ),
      name: currentPlugin?.name ?? previousPlugin?.name ?? key,
      previousPluginId: previousPlugin?.pluginId,
      currentPluginId: currentPlugin?.pluginId,
      previousCalls: previousPlugin?.calls ?? 0,
      currentCalls: currentPlugin?.calls ?? 0,
      previousResolveDuration: previousPlugin?.resolveDuration ?? 0,
      currentResolveDuration: currentPlugin?.resolveDuration ?? 0,
      previousLoadDuration: previousPlugin?.loadDuration ?? 0,
      currentLoadDuration: currentPlugin?.loadDuration ?? 0,
      previousTransformDuration: previousPlugin?.transformDuration ?? 0,
      currentTransformDuration: currentPlugin?.transformDuration ?? 0,
      ...metric,
    }
  }))
}

export const rolldownGetSessionCompareDetails = defineRpcFunction({
  name: 'vite:rolldown:get-session-compare-details',
  type: 'query',
  cacheable: true,
  setup: async (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ sessions }: { sessions: string[] }): Promise<SessionCompareDetails> => {
        const [previousSession, currentSession] = sessions
        const [previousReader, currentReader] = await Promise.all([
          manager.loadAssetSession(previousSession!),
          manager.loadAssetSession(currentSession!),
        ])
        const previous = createCompareSource(previousReader)
        const current = createCompareSource(currentReader)

        const assets = compareAssets(previous, current)
        const chunks = compareChunks(previous, current)
        const packages = comparePackages(previous, current)
        const plugins = await comparePlugins(previous, current)

        return {
          sessionStats: {
            previous: {
              packages: previous.packages.length,
              duplicatedPackages: previous.packages.filter(pkg => pkg.duplicated).length,
            },
            current: {
              packages: current.packages.length,
              duplicatedPackages: current.packages.filter(pkg => pkg.duplicated).length,
            },
          },
          assets,
          chunks,
          packages,
          plugins,
        }
      },
    }
  },
})
