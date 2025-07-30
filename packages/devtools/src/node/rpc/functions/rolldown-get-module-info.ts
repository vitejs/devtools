import type { ModuleInfo } from '../../../shared/types'
import { defineRpcFunction } from '../utils'

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

        const moduleInfo = reader.manager.modules.get(module)

        const info: Omit<ModuleInfo, 'transforms'> = {
          id: module,
          imports: [],
          importers: [],
          chunks: [],
          assets: [],
          build_metrics: {
            resolve_ids: [],
            loads: [],
            transforms: [],
          },
          ...moduleInfo || {},
          loads: moduleInfo?.build_metrics?.loads ?? [],
          resolve_ids: moduleInfo?.build_metrics?.resolve_ids ?? [],
        }

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
