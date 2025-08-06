import type { Asset as AssetInfo, Chunk as ChunkInfo, Event, HookLoadCallEnd, HookLoadCallStart, HookResolveIdCallEnd, HookResolveIdCallStart, HookTransformCallEnd, HookTransformCallStart, Module as ModuleInfo } from '@rolldown/debug'
import type { ModuleBuildMetrics } from '~~/shared/types'
import { getContentByteSize } from '../utils/format'

export type RolldownEvent = Event & {
  event_id: string
}

type ModuleBuildHookEvents = (Exclude<Event, 'StringRef'> & (HookResolveIdCallStart | HookResolveIdCallEnd | HookLoadCallStart | HookLoadCallEnd | HookTransformCallStart | HookTransformCallEnd)) & { event_id: string }

const DURATION_THRESHOLD = 10
const MODULE_BUILD_START_HOOKS = ['HookResolveIdCallStart', 'HookLoadCallStart', 'HookTransformCallStart']
const MODULE_BUILD_END_HOOKS = ['HookResolveIdCallEnd', 'HookLoadCallEnd', 'HookTransformCallEnd']

export class RolldownEventsManager {
  events: RolldownEvent[] = []
  chunks: Map<number, ChunkInfo> = new Map()
  assets: Map<string, AssetInfo> = new Map()
  modules: Map<string, ModuleInfo & { build_metrics?: ModuleBuildMetrics }> = new Map()
  source_refs: Map<string, string> = new Map()
  module_build_hook_events: Map<string, ModuleBuildHookEvents> = new Map()
  module_build_metrics: Map<string, ModuleBuildMetrics> = new Map()
  build_start_time: number = 0
  build_end_time: number = 0

  interpretSourceRefs(event: Event, key: 'content') {
    if (key in event && typeof event[key as keyof Event] === 'string') {
      if (event[key as keyof Event].startsWith('$ref:')) {
        const refKey = event[key as keyof Event].slice(5)
        if (this.source_refs.has(refKey)) {
          event[key] = this.source_refs.get(refKey)!
        }
      }
    }
  }

  recordModuleBuildMetrics(event: ModuleBuildHookEvents) {
    if (MODULE_BUILD_START_HOOKS.includes(event.action)) {
      this.module_build_hook_events.set(event.call_id, event)
    }
    else if (MODULE_BUILD_END_HOOKS.includes(event.action)) {
      const start = this.module_build_hook_events.get(event.call_id)
      const module_id = event.action === 'HookResolveIdCallEnd' ? event.resolved_id! : (event as HookLoadCallEnd | HookTransformCallEnd).module_id
      if (start) {
        const info = {
          id: event.event_id,
          timestamp_start: +start.timestamp,
          timestamp_end: +event.timestamp,
          duration: +event.timestamp - +start.timestamp,
          plugin_id: event.plugin_id,
          plugin_name: event.plugin_name,
        }
        const module_build_metrics = this.module_build_metrics.get(module_id) ?? { resolve_ids: [], loads: [], transforms: [] }
        if (event.action === 'HookResolveIdCallEnd') {
          module_build_metrics.resolve_ids.push({
            ...info,
            type: 'resolve',
            importer: (start as HookResolveIdCallStart).importer,
            module_request: (start as HookResolveIdCallStart).module_request,
            import_kind: (start as HookResolveIdCallStart).import_kind,
            resolved_id: event.resolved_id,
          })
        }
        else if (event.action === 'HookLoadCallEnd') {
          if (!event.content && info.duration < DURATION_THRESHOLD) {
            return
          }
          module_build_metrics.loads.push({
            ...info,
            type: 'load',
            content: event.content,
          })
        }
        else if (event.action === 'HookTransformCallEnd') {
          const _start = start as HookTransformCallStart
          const _end = event as HookTransformCallEnd
          const no_changes = _start.content === _end.content
          if (no_changes && info.duration < DURATION_THRESHOLD) {
            return
          }

          module_build_metrics.transforms.push({
            ...info,
            type: 'transform',
            content_from: _start.content,
            content_to: _end.content,
            source_code_size: getContentByteSize(_start.content!),
            transformed_code_size: getContentByteSize(_end.content!),
          })
        }
        this.module_build_metrics.set(module_id, module_build_metrics)
      }
    }
  }

  handleEvent(raw: Event) {
    const event = {
      ...raw,
      event_id: `${'timestamp' in raw ? raw.timestamp : 'x'}#${this.events.length}`,
    }
    this.events.push(event)

    if (event.action === 'BuildStart') {
      this.build_start_time = +event.timestamp
    }

    if (event.action === 'BuildEnd') {
      this.build_end_time = +event.timestamp
    }

    if (event.action === 'StringRef') {
      this.source_refs.set(event.id, event.content)
      return
    }

    if (event.action === 'ChunkGraphReady') {
      for (const chunk of event.chunks) {
        this.chunks.set(chunk.chunk_id, chunk)
      }
      return
    }

    this.interpretSourceRefs(event, 'content')
    this.recordModuleBuildMetrics(event as ModuleBuildHookEvents)

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
        this.assets.set(asset.filename, asset)
      }
    }

    return event
  }

  dispose() {
    this.events = []
  }

  [Symbol.dispose]() {
    this.dispose()
  }
}
