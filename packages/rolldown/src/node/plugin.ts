import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { DEVTOOLS_VITEPLUS_GROUP_ID } from '@vitejs/devtools-kit/constants'
import { clientPublicDir } from '../dirs'
import { rpcFunctions } from './rpc/index'

const ROLLDOWN_DEVTOOLS_BASE = '/__devtools-rolldown/'

export function DevToolsRolldownUI(): PluginWithDevTools {
  return {
    name: 'vite:devtools:rolldown-ui',
    devtools: {
      setup(ctx) {
        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn as any)
        }

        ctx.views.hostStatic(
          ROLLDOWN_DEVTOOLS_BASE,
          clientPublicDir,
        )

        ctx.docks.register({
          id: 'rolldown',
          title: 'Rolldown',
          groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
          icon: `${ROLLDOWN_DEVTOOLS_BASE}favicon.svg`,
          type: 'iframe',
          url: ROLLDOWN_DEVTOOLS_BASE,
        })
      },
    },
  }
}
