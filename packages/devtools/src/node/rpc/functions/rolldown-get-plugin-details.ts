import { defineRpcFunction } from '../utils'

export const rolldownGetPluginDetails = defineRpcFunction({
  name: 'vite:rolldown:get-plugin-details',
  type: 'query',
  setup: ({ manager }) => {
    return {
      handler: async ({ session, id }: { session: string, id: string }) => {
        const reader = await manager.loadSession(session)
        const plugins = reader.meta?.plugins || []
        const events = reader.manager.events
        const pluginBuildMetrics = reader.manager.plugin_build_metrics.get(+id)
        // @ts-expect-error skip type check
        const matched = events.filter(e => e.plugin_id === +id)
        const plugin = plugins.find(p => p.plugin_id === +id)
        const resolveIdMetrics = pluginBuildMetrics?.calls.filter(c => c.type === 'resolve')
        const loadMetrics = pluginBuildMetrics?.calls.filter(c => c.type === 'load')
        const transformMetrics = pluginBuildMetrics?.calls.filter(c => c.type === 'transform')
        return {
          name: plugin?.name,
          matched: matched.length,
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
