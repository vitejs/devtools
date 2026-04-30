import type { DevtoolsPluginInfo } from '../../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const getDevtoolsPlugins = defineRpcFunction({
  name: 'devtoolskit:self-inspect:get-devtools-plugins',
  type: 'query',
  agent: {
    description: 'List every Vite plugin involved in the current project, flagging which ones export a `devtools` hook (and whether that hook sets up any devtools surface). Read-only.',
    title: 'List devtools plugins',
  },
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
