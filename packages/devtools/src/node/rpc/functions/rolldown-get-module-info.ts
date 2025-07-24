import type { ModuleInfo, RolldownResolveInfo } from '../../../shared/types'
import { defineRpcFunction } from '../utils'

const DURATION_THRESHOLD = 10

export const rolldownGetModuleInfo = defineRpcFunction({
  name: 'vite:rolldown:get-module-info',
  type: 'query',
  setup: ({ manager }) => {
    return {
      handler: async ({ session, module }: { session: string, module: string }) => {
        const reader = await manager.loadSession(session)
        const events = reader.manager.events

        if (!events.length)
          return null

        const info: Omit<ModuleInfo, 'transforms'> = {
          id: module,
          loads: [],
          imports: [],
          importers: [],
          resolve_ids: [],
          chunks: [],
          assets: [],
          build_metrics: {
            resolve_ids: [],
            loads: [],
            transforms: [],
          },
          ...reader.manager.modules.get(module) || {},
        }

        events.forEach((start, index) => {
          if (start.action !== 'HookLoadCallStart' || start.module_id !== module)
            return

          const end = events.find(e => e.action === 'HookLoadCallEnd' && e.call_id === start.call_id, index)
          if (!end || end.action !== 'HookLoadCallEnd') {
            console.error(`[rolldown] Load call end not found for ${start.call_id}`)
            return
          }
          const duration = +end.timestamp - +start.timestamp
          if (!end.content && duration < DURATION_THRESHOLD)
            return

          info.loads.push({
            type: 'load',
            id: start.event_id,
            plugin_name: start.plugin_name,
            plugin_id: start.plugin_id,
            content: end.content,
            timestamp_start: +start.timestamp,
            timestamp_end: +end.timestamp,
            duration,
          })
        })

        events.forEach((end) => {
          if (end.action !== 'HookResolveIdCallEnd' || end.resolved_id !== module)
            return
          const start = events.find(e => e.action === 'HookResolveIdCallStart' && e.call_id === end.call_id)
          if (!start || start.action !== 'HookResolveIdCallStart') {
            console.error(`[rolldown] resolveId call start not found for ${end.event_id}`)
            return
          }

          const duration = +end.timestamp - +start.timestamp
          const data: RolldownResolveInfo = {
            type: 'resolve',
            id: end.event_id,
            importer: start.importer,
            module_request: start.module_request,
            import_kind: start.import_kind,
            plugin_name: end.plugin_name,
            plugin_id: end.plugin_id,
            resolved_id: end.resolved_id,
            timestamp_start: +start.timestamp,
            timestamp_end: +end.timestamp,
            duration,
          }

          // In Rolldown, resolveId might be called multiple times with different threads of Rust
          // If that happens, we only keep the last one
          const existingIndex = info.resolve_ids.findIndex(r => r.importer === start.importer && r.module_request === start.module_request && r.import_kind === start.import_kind && r.plugin_id === end.plugin_id)
          if (existingIndex >= 0)
            info.resolve_ids.splice(existingIndex, 1)
          info.resolve_ids.push(data)
        })

        info.chunks = Array.from(reader.manager.chunks.values())
          .filter(chunk => chunk.modules.includes(module))
          .map(chunk => ({
            type: 'chunk',
            ...chunk,
          }))
        info.assets = Array.from(reader.manager.assets.values())
          .filter(asset => info.chunks.some(chunk => chunk.chunk_id === asset.chunk_id))
          .map(asset => ({
            type: 'asset',
            ...asset,
          }))

        info.loads.sort((a, b) => a.plugin_id - b.plugin_id)
        info.resolve_ids.sort((a, b) => a.plugin_id - b.plugin_id)

        return info
      },
    }
  },
})
