import type { RolldownPluginBuildMetrics } from '~~/shared/types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getLogsManager } from '../utils'

export const rolldownGetPluginDetails = defineRpcFunction({
  name: 'vite:rolldown:get-plugin-details',
  type: 'query',
  setup: (context) => {
    const manager = getLogsManager(context)
    return {
      handler: async ({ session, id }: { session: string, id: string }) => {
        const reader = await manager.loadSession(session)
        const pluginBuildMetrics = reader.manager.plugin_build_metrics.get(+id)!
        if (!pluginBuildMetrics) {
          const plugin = reader.meta!.plugins!.find(p => p.plugin_id === +id)!
          return {
            plugin_name: plugin?.name,
            plugin_id: +id,
            calls: [],
            loadMetrics: [],
            resolveIdMetrics: [],
            transformMetrics: [],
          } satisfies RolldownPluginBuildMetrics
        }
        const resolveIdMetrics = pluginBuildMetrics.calls.filter(c => c.type === 'resolve')!
        const loadMetrics = pluginBuildMetrics.calls.filter(c => c.type === 'load')!
        const transformMetrics = pluginBuildMetrics.calls.filter(c => c.type === 'transform')!
        return {
          ...pluginBuildMetrics,
          resolveIdMetrics,
          loadMetrics,
          transformMetrics,
        } satisfies RolldownPluginBuildMetrics
      },
    }
  },
})
