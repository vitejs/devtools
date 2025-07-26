import type { Asset as AssetInfo, Chunk as ChunkInfo, Event, Module as ModuleInfo } from '@rolldown/debug'

export type RolldownEvent = Event & {
  event_id: string
}

export class RolldownEventsManager {
  events: RolldownEvent[] = []
  chunks: Map<number, ChunkInfo> = new Map()
  assets: Map<string, AssetInfo> = new Map()
  modules: Map<string, ModuleInfo> = new Map()
  source_refs: Map<string, string> = new Map()
  build_start_time: number = 0
  build_end_time: number = 0

  interpretSourceRefs(event: Event, key: string) {
    if (key in event && typeof event[key as keyof Event] === 'string') {
      if (event[key as keyof Event].startsWith('$ref:')) {
        const refKey = event[key as keyof Event].slice(5)
        if (this.source_refs.has(refKey)) {
          (event as any)[key] = this.source_refs.get(refKey)
        }
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

    this.interpretSourceRefs(event, 'source')
    this.interpretSourceRefs(event, 'content')

    if ('module_id' in event) {
      if (this.modules.has(event.module_id))
        return
      this.modules.set(event.module_id, {
        id: event.module_id,
        is_external: false,
        imports: [],
        importers: [],
      })
    }

    if (event.action === 'ModuleGraphReady') {
      for (const module of event.modules) {
        this.modules.set(module.id, module)
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
