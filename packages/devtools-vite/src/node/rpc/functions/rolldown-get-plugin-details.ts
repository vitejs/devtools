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
        const plugins = reader.meta?.plugins || []
        const pluginBuildMetrics = reader.manager.plugin_build_metrics.get(+id)
        const plugin = plugins.find(p => p.plugin_id === +id)
        const resolveIdMetrics = pluginBuildMetrics?.calls.filter(c => c.type === 'resolve')
        const loadMetrics = pluginBuildMetrics?.calls.filter(c => c.type === 'load')
        const transformMetrics = pluginBuildMetrics?.calls.filter(c => c.type === 'transform')
        return {
          name: plugin?.name,
          buildMetrics: {
            ...pluginBuildMetrics,
            resolveIdMetrics,
            loadMetrics,
            transformMetrics,
          },
        }
      },
    }
  },
})
