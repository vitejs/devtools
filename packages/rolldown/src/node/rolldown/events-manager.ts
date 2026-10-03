import type { Event, HookLoadCallEnd, HookLoadCallStart, HookResolveIdCallEnd, HookResolveIdCallStart, HookTransformCallEnd, HookTransformCallStart, Module as ModuleInfo, PackageInfo as RolldownPackageInfo } from '@rolldown/debug'
import type { ModuleBuildMetrics, PluginBuildMetrics, RolldownAssetInfo, RolldownChunkInfo } from '../../shared/types'
import { guessChunkName } from '../../shared/utils/guess-chunk-name'
import { getInitialChunkIds } from '../utils/chunk'
import { getContentByteSize } from '../utils/format'

export type RolldownEvent = Event & {
  event_id: string
}

type ModuleBuildHookEvents = (Exclude<Event, 'StringRef'> & (HookResolveIdCallStart | HookResolveIdCallEnd | HookLoadCallStart | HookLoadCallEnd | HookTransformCallStart | HookTransformCallEnd)) & { event_id: string }

const MODULE_BUILD_START_HOOKS = ['HookResolveIdCallStart', 'HookLoadCallStart', 'HookTransformCallStart']
const MODULE_BUILD_END_HOOKS = ['HookResolveIdCallEnd', 'HookLoadCallEnd', 'HookTransformCallEnd']

export interface ContentInfo {
  byteSize: number
}

type ModuleSnapshot = Omit<ModuleInfo & { build_metrics?: ModuleBuildMetrics }, 'build_metrics'>

export type PendingModuleBuildHookEvent
  = | {
    action: 'HookResolveIdCallStart'
    timestamp: string
    importer: HookResolveIdCallStart['importer']
    module_request: HookResolveIdCallStart['module_request']
    import_kind: HookResolveIdCallStart['import_kind']
  }
  | {
    action: 'HookLoadCallStart'
    timestamp: string
  }
  | {
    action: 'HookTransformCallStart'
    timestamp: string
    contentInfo: ContentInfo
  }

export interface RolldownEventsManagerSnapshot {
  eventCount: number
  lastEvent: RolldownEvent | undefined
  chunks: Array<[number, RolldownChunkInfo]>
  modules: Array<[string, ModuleSnapshot]>
  packageGraphReady: boolean
  packages: Array<[string, RolldownPackageInfo]>
  source_refs: Array<[string, ContentInfo]>
  module_build_hook_events: Array<[string, PendingModuleBuildHookEvent]>
  module_build_metrics: Array<[string, ModuleBuildMetrics]>
  plugin_build_metrics: Array<[number, PluginBuildMetrics]>
  build_start_time: number
  build_end_time: number
}

function getContentInfo(content: string | null | undefined): ContentInfo {
  if (!content) {
    return {
      byteSize: 0,
    }
  }
  return {
    byteSize: getContentByteSize(content),
  }
}

export function getContentRef(content: unknown) {
  return typeof content === 'string' && content.startsWith('$ref:')
    ? content.slice(5)
    : undefined
}

export function getEventId(event: Event, index: number) {
  return `${'timestamp' in event ? event.timestamp : 'x'}#${index}`
}

function getLastEventSnapshot(event: RolldownEvent): RolldownEvent {
  if (!('action' in event)) {
    return event
  }

  const snapshot: Record<string, unknown> = {
    action: event.action,
    event_id: event.event_id,
  }

  if ('timestamp' in event) {
    snapshot.timestamp = event.timestamp
  }
  if ('session_id' in event) {
    snapshot.session_id = event.session_id
  }

  return snapshot as RolldownEvent
}

export class RolldownEventsManager {
  eventCount = 0
  lastEvent: RolldownEvent | undefined
  chunks: Map<number, RolldownChunkInfo> = new Map()
  assets: Map<string, RolldownAssetInfo> = new Map()
  chunkAssetMap = new Map<number, RolldownAssetInfo>()
  modules: Map<string, ModuleInfo & { build_metrics?: ModuleBuildMetrics }> = new Map()
  packageGraphReady = false
  packages: Map<string, RolldownPackageInfo> = new Map()
  source_refs: Map<string, ContentInfo> = new Map()
  module_build_hook_events: Map<string, PendingModuleBuildHookEvent> = new Map()
  module_build_metrics: Map<string, ModuleBuildMetrics> = new Map()
  plugin_build_metrics: Map<number, PluginBuildMetrics> = new Map()
  build_start_time: number = 0
  build_end_time: number = 0

  getEventContentInfo(event: any, key: 'content') {
    if (!(key in event)) {
      return getContentInfo(undefined)
    }

    const content = event[key]
    const refKey = getContentRef(content)
    if (refKey) {
      return this.source_refs.get(refKey) ?? getContentInfo(undefined)
    }
    return typeof content === 'string'
      ? getContentInfo(content)
      : getContentInfo(undefined)
  }

  recordBuildMetrics(event: ModuleBuildHookEvents) {
    if (MODULE_BUILD_START_HOOKS.includes(event.action)) {
      if (event.action === 'HookResolveIdCallStart') {
        this.module_build_hook_events.set(event.call_id, {
          action: event.action,
          timestamp: event.timestamp,
          importer: event.importer,
          module_request: event.module_request,
          import_kind: event.import_kind,
        })
      }
      else if (event.action === 'HookLoadCallStart') {
        this.module_build_hook_events.set(event.call_id, {
          action: event.action,
          timestamp: event.timestamp,
        })
      }
      else if (event.action === 'HookTransformCallStart') {
        this.module_build_hook_events.set(event.call_id, {
          action: event.action,
          timestamp: event.timestamp,
          contentInfo: this.getEventContentInfo(event, 'content'),
        })
      }
    }
    else if (MODULE_BUILD_END_HOOKS.includes(event.action)) {
      const start = this.module_build_hook_events.get(event.call_id)
      this.module_build_hook_events.delete(event.call_id)
      const module_id = event.action === 'HookResolveIdCallEnd' ? event.resolved_id! : (event as HookLoadCallEnd | HookTransformCallEnd).module_id
      if (start) {
        const pluginId = event.plugin_id
        const info = {
          id: event.event_id,
          timestamp_start: +start.timestamp,
          timestamp_end: +event.timestamp,
          duration: +event.timestamp - +start.timestamp,
          plugin_id: pluginId,
          plugin_name: event.plugin_name,
        }
        const module_build_metrics = this.module_build_metrics.get(module_id) ?? { resolve_ids: [], loads: [], transforms: [] }
        const plugin_build_metrics = this.plugin_build_metrics.get(pluginId) ?? {
          plugin_id: pluginId,
          plugin_name: event.plugin_name,
          calls: [],
        }
        if (event.action === 'HookResolveIdCallEnd') {
          if (start.action !== 'HookResolveIdCallStart')
            return

          module_build_metrics.resolve_ids.push({
            ...info,
            type: 'resolve',
            importer: start.importer,
            module_request: start.module_request,
            import_kind: start.import_kind,
            resolved_id: event.resolved_id,
          })
          plugin_build_metrics.calls.push({
            ...info,
            type: 'resolve',
            module: start.module_request,
          })
        }
        else if (event.action === 'HookLoadCallEnd') {
          if (start.action !== 'HookLoadCallStart')
            return

          module_build_metrics.loads.push({
            ...info,
            type: 'load',
            content: null,
          })
          plugin_build_metrics.calls.push({
            ...info,
            type: 'load',
            module: event.module_id,
            unchanged: !event.content,
          })
        }
        else if (event.action === 'HookTransformCallEnd') {
          if (start.action !== 'HookTransformCallStart')
            return

          const sourceContentInfo = start.contentInfo
          const transformedContentInfo = this.getEventContentInfo(event, 'content')

          module_build_metrics.transforms.push({
            ...info,
            type: 'transform',
            content_from: null,
            content_to: null,
            source_code_size: sourceContentInfo.byteSize,
            transformed_code_size: transformedContentInfo.byteSize,
          })
          plugin_build_metrics.calls.push({
            ...info,
            type: 'transform',
            module: event.module_id,
          })
        }
        this.plugin_build_metrics.set(pluginId, plugin_build_metrics)
        this.module_build_metrics.set(module_id, module_build_metrics)
      }
    }
  }

  handleEvent(raw: Event) {
    const event = raw as RolldownEvent
    event.event_id = getEventId(raw, this.eventCount)
    this.eventCount += 1
    this.lastEvent = getLastEventSnapshot(event)

    if (event.action === 'BuildStart') {
      this.build_start_time = +event.timestamp
    }

    if (event.action === 'BuildEnd') {
      this.build_end_time = +event.timestamp
      if (!this.module_build_hook_events.size) {
        this.source_refs.clear()
      }
    }

    if (event.action === 'StringRef') {
      this.source_refs.set(event.id, getContentInfo(event.content))
      return
    }

    if (event.action === 'ChunkGraphReady') {
      const initialChunkIds = getInitialChunkIds(event.chunks)
      for (const chunk of event.chunks) {
        this.chunks.set(chunk.chunk_id, { ...chunk, is_initial: initialChunkIds.has(chunk.chunk_id), name: chunk.name || guessChunkName(chunk) })
      }
      return
    }

    if (event.action === 'PackageGraphReady') {
      this.packageGraphReady = true
      this.packages = new Map(event.packages.map(pkg => [pkg.package_id, pkg]))
      return
    }

    this.recordBuildMetrics(event as ModuleBuildHookEvents)

    if ('module_id' in event) {
      if (this.modules.has(event.module_id))
        return
      this.modules.set(event.module_id, {
        id: event.module_id,
        is_external: false,
        imports: [],
        importers: [],
        build_metrics: {
          resolve_ids: [],
          loads: [],
          transforms: [],
        },
      })
    }

    if (event.action === 'ModuleGraphReady') {
      this.module_build_hook_events.clear()
      this.source_refs.clear()
      for (const module of event.modules) {
        this.modules.set(module.id, {
          ...module,
          build_metrics: this.module_build_metrics.get(module.id),
        })
        module.importers = Array.from(new Set(module.importers || [])).sort((a, b) => a.localeCompare(b))
        module.imports = Array.from(new Set(module.imports || [])).sort((a, b) => a.module_id.localeCompare(b.module_id))
      }
    }

    if (event.action === 'AssetsReady') {
      for (const asset of event.assets) {
        this.assets.set(asset.filename, { ...asset, chunk: this.chunks.get(asset.chunk_id!) })
      }
      this.chunkAssetMap = new Map(event.assets.map(asset => [asset.chunk_id!, asset]))
    }

    return event
  }

  dispose() {
    this.eventCount = 0
    this.lastEvent = undefined
    this.chunks.clear()
    this.assets.clear()
    this.chunkAssetMap.clear()
    this.modules.clear()
    this.packageGraphReady = false
    this.packages.clear()
    this.source_refs.clear()
    this.module_build_hook_events.clear()
    this.module_build_metrics.clear()
    this.plugin_build_metrics.clear()
    this.build_start_time = 0
    this.build_end_time = 0
  }

  snapshot(): RolldownEventsManagerSnapshot {
    return {
      eventCount: this.eventCount,
      lastEvent: this.lastEvent,
      chunks: Array.from(this.chunks.entries()),
      packageGraphReady: this.packageGraphReady,
      packages: Array.from(this.packages.entries()),
      modules: Array.from(this.modules.entries()).map(([id, module]) => {
        const { build_metrics, ...snapshot } = module
        return [id, snapshot]
      }),
      source_refs: Array.from(this.source_refs.entries()),
      module_build_hook_events: Array.from(this.module_build_hook_events.entries()),
      module_build_metrics: Array.from(this.module_build_metrics.entries()),
      plugin_build_metrics: Array.from(this.plugin_build_metrics.entries()),
      build_start_time: this.build_start_time,
      build_end_time: this.build_end_time,
    }
  }

  restore(snapshot: RolldownEventsManagerSnapshot) {
    this.eventCount = snapshot.eventCount
    this.lastEvent = snapshot.lastEvent
    this.chunks = new Map(snapshot.chunks)
    this.packageGraphReady = snapshot.packageGraphReady ?? !!snapshot.packages?.length
    this.packages = new Map(snapshot.packages ?? [])
    this.assets.clear()
    this.chunkAssetMap.clear()
    this.source_refs = new Map(snapshot.source_refs)
    this.module_build_hook_events = new Map(snapshot.module_build_hook_events)
    this.module_build_metrics = new Map(snapshot.module_build_metrics)
    this.modules = new Map(snapshot.modules.map(([id, module]) => [id, {
      ...module,
      build_metrics: this.module_build_metrics.get(id),
    }]))
    this.plugin_build_metrics = new Map(snapshot.plugin_build_metrics)
    this.build_start_time = snapshot.build_start_time
    this.build_end_time = snapshot.build_end_time
  }

  [Symbol.dispose]() {
    this.dispose()
  }
}
