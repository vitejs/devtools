import type { Event, SessionMeta } from '@rolldown/debug'
import type { ModuleBuildMetrics, RolldownModuleLoadInfo, RolldownModuleTransformInfo, RolldownResolveInfo } from '../../shared/types'
import fs from 'node:fs'
import { getContentByteSize } from '../utils/format'
import { parseJsonStream } from '../utils/json-parse-stream'
import { getContentRef, getEventId, RolldownEventsManager } from './events-manager'

const readers: Map<string, RolldownEventsReader> = new Map()
const MAX_READERS = 32

interface DeferredContent {
  value: string | null
  ref: string | null
}

interface PendingResolveStart {
  timestamp: string
  importer: string | null
  module_request: string
  import_kind: RolldownResolveInfo['import_kind']
}

interface PendingLoadStart {
  timestamp: string
}

interface PendingTransformStart {
  timestamp: string
  content: DeferredContent
}

function getDeferredContent(event: any, refs: Set<string>): DeferredContent {
  if (!('content' in event) || typeof event.content !== 'string') {
    return {
      value: null,
      ref: null,
    }
  }

  const ref = getContentRef(event.content)
  if (ref) {
    refs.add(ref)
    return {
      value: null,
      ref,
    }
  }

  return {
    value: event.content,
    ref: null,
  }
}

function resolveDeferredContent(content: DeferredContent, refs: Map<string, string>) {
  if (content.ref) {
    return refs.get(content.ref) ?? `$ref:${content.ref}`
  }
  return content.value
}

function pruneReaders() {
  if (readers.size <= MAX_READERS)
    return

  for (const reader of Array.from(readers.values())) {
    if (readers.size <= MAX_READERS)
      return
    if (!reader.hasPendingRead()) {
      reader.dispose()
    }
  }
}

export class RolldownEventsReader {
  lastBytes: number = 0
  lastTimestamp: number = 0
  manager = new RolldownEventsManager()
  meta: SessionMeta | undefined
  private pendingRead: Promise<void> | undefined

  private constructor(
    readonly filepath: string,
  ) {
  }

  static get(filepath: string) {
    if (readers.has(filepath)) {
      const reader = readers.get(filepath)!
      readers.delete(filepath)
      readers.set(filepath, reader)
      return reader
    }
    const reader = new RolldownEventsReader(filepath)
    readers.set(filepath, reader)
    pruneReaders()
    return reader
  }

  async read() {
    if (this.pendingRead) {
      return this.pendingRead
    }

    this.pendingRead = this.readChanges().finally(() => {
      this.pendingRead = undefined
    })
    return this.pendingRead
  }

  private async readChanges() {
    const { mtime, size } = await fs.promises.stat(this.filepath)
    if (mtime.getTime() <= this.lastTimestamp) {
      return
    }
    const stream = fs.createReadStream(this.filepath, {
      start: this.lastBytes,
    })
    await parseJsonStream<Event>(
      stream,
      (event) => {
        if (event.action === 'SessionMeta') {
          this.meta = event as SessionMeta
        }
        this.manager.handleEvent(event)
      },
    )
    this.lastTimestamp = mtime.getTime()
    this.lastBytes = size
  }

  private async scanEvents(processor: (event: Event, eventIndex: number) => void | Promise<void>) {
    let eventIndex = 0
    await parseJsonStream<Event>(
      fs.createReadStream(this.filepath),
      async (event) => {
        await processor(event, eventIndex)
        eventIndex += 1
      },
    )
  }

  private async readStringRefs(refs: Set<string>) {
    const values = new Map<string, string>()
    if (!refs.size)
      return values

    await this.scanEvents((event) => {
      if (event.action !== 'StringRef' || !refs.has(event.id))
        return

      values.set(event.id, event.content)
    })

    return values
  }

  async readModuleBuildMetrics(module: string): Promise<ModuleBuildMetrics> {
    const resolveStarts = new Map<string, PendingResolveStart>()
    const loadStarts = new Map<string, PendingLoadStart>()
    const transformStarts = new Map<string, PendingTransformStart>()
    const refs = new Set<string>()
    const resolve_ids: RolldownResolveInfo[] = []
    const loads: Array<Omit<RolldownModuleLoadInfo, 'content'> & { content: DeferredContent }> = []
    const transforms: Array<Omit<RolldownModuleTransformInfo, 'content_from' | 'content_to' | 'diff_added' | 'diff_removed'> & {
      content_from: DeferredContent
      content_to: DeferredContent
      source_code_size: number
      transformed_code_size: number
    }> = []

    await this.scanEvents((raw, eventIndex) => {
      const event = raw as any
      const eventId = getEventId(raw, eventIndex)

      if (event.action === 'HookResolveIdCallStart') {
        resolveStarts.set(event.call_id, {
          timestamp: event.timestamp,
          importer: event.importer,
          module_request: event.module_request,
          import_kind: event.import_kind,
        })
        return
      }
      if (event.action === 'HookLoadCallStart') {
        if (event.module_id === module) {
          loadStarts.set(event.call_id, {
            timestamp: event.timestamp,
          })
        }
        return
      }
      if (event.action === 'HookTransformCallStart') {
        if (event.module_id === module) {
          transformStarts.set(event.call_id, {
            timestamp: event.timestamp,
            content: getDeferredContent(event, refs),
          })
        }
        return
      }

      if (event.action === 'HookResolveIdCallEnd') {
        const start = resolveStarts.get(event.call_id)
        resolveStarts.delete(event.call_id)
        if (!start || event.resolved_id !== module)
          return

        resolve_ids.push({
          id: eventId,
          type: 'resolve',
          timestamp_start: +start.timestamp,
          timestamp_end: +event.timestamp,
          duration: +event.timestamp - +start.timestamp,
          plugin_id: event.plugin_id,
          plugin_name: event.plugin_name,
          importer: start.importer,
          module_request: start.module_request,
          import_kind: start.import_kind,
          resolved_id: event.resolved_id,
        })
      }

      if (event.action === 'HookLoadCallEnd') {
        const start = loadStarts.get(event.call_id)
        loadStarts.delete(event.call_id)
        if (!start || event.module_id !== module)
          return

        loads.push({
          id: eventId,
          type: 'load',
          timestamp_start: +start.timestamp,
          timestamp_end: +event.timestamp,
          duration: +event.timestamp - +start.timestamp,
          plugin_id: event.plugin_id,
          plugin_name: event.plugin_name,
          content: getDeferredContent(event, refs),
        })
      }

      if (event.action === 'HookTransformCallEnd') {
        const start = transformStarts.get(event.call_id)
        transformStarts.delete(event.call_id)
        if (!start || event.module_id !== module)
          return

        const content_from = start.content
        const content_to = getDeferredContent(event, refs)

        transforms.push({
          id: eventId,
          type: 'transform',
          timestamp_start: +start.timestamp,
          timestamp_end: +event.timestamp,
          duration: +event.timestamp - +start.timestamp,
          plugin_id: event.plugin_id,
          plugin_name: event.plugin_name,
          content_from,
          content_to,
          source_code_size: 0,
          transformed_code_size: 0,
        })
      }
    })

    const refValues = await this.readStringRefs(refs)

    return {
      resolve_ids,
      loads: loads.map(load => ({
        ...load,
        content: resolveDeferredContent(load.content, refValues),
      })),
      transforms: transforms.map((transform) => {
        const content_from = resolveDeferredContent(transform.content_from, refValues)
        const content_to = resolveDeferredContent(transform.content_to, refValues)
        return {
          ...transform,
          content_from,
          content_to,
          source_code_size: getContentByteSize(content_from ?? ''),
          transformed_code_size: getContentByteSize(content_to ?? ''),
        }
      }),
    }
  }

  hasPendingRead() {
    return !!this.pendingRead
  }

  dispose() {
    readers.delete(this.filepath)
    this.manager.dispose()
  }

  [Symbol.dispose]() {
    this.dispose()
  }
}
