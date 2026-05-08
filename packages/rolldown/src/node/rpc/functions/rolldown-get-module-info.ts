import type { ModuleInfo } from '../../../shared/types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownGetModuleInfo = defineRpcFunction({
  name: 'vite:rolldown:get-module-info',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session, module }: { session: string, module: string }) => {
        const reader = await manager.loadSession(session)

        if (!reader.manager.eventCount)
          return null

        const moduleInfo = reader.manager.modules.get(module)
        const moduleMetrics = await reader.readModuleBuildMetrics(module)

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
          loads: moduleMetrics.loads,
          resolve_ids: moduleMetrics.resolve_ids,
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
