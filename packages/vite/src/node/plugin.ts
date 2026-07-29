import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import type { PluginOption } from 'vite'
import { DEVTOOLS_VITEPLUS_GROUP_ID } from '@vitejs/devtools-kit/constants'
import { clientPublicDir } from '../dirs'
import { DevToolsViteInspect } from './inspect/plugin'

const VITE_DEVTOOLS_BASE = '/__devtools-vite/'

export function DevToolsViteUI(): PluginOption {
  return [
    DevToolsViteInspect(),
    DevToolsViteUIPlugin(),
  ]
}

export function DevToolsViteUIPlugin(): PluginWithDevTools {
  return {
    name: 'vite:devtools:vite-ui',
    enforce: 'pre',

    devtools: {
      setup(ctx) {
        ctx.views.hostStatic(
          VITE_DEVTOOLS_BASE,
          clientPublicDir,
        )

        ctx.docks.register({
          id: 'vite',
          title: 'Vite',
          icon: `${VITE_DEVTOOLS_BASE}favicon.svg`,
          groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
          type: 'iframe',
          url: VITE_DEVTOOLS_BASE,
        })
      },
    },
  }
}
