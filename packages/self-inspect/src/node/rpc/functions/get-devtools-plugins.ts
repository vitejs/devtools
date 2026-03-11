import type { DevtoolsPluginInfo } from '../../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const getDevtoolsPlugins = defineRpcFunction({
  name: 'devtoolskit:self-inspect:get-devtools-plugins',
  type: 'query',
  setup: (context) => {
    return {
      handler: async () => {
        return context.viteConfig.plugins.map((plugin): DevtoolsPluginInfo => ({
          name: plugin.name,
          hasDevtools: 'devtools' in plugin,
          hasSetup: !!plugin.devtools?.setup,
          capabilities: plugin.devtools?.capabilities,
        }))
      },
    }
  },
})
