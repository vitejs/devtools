import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { clientPublicDir } from '../dirs'
import { rpcFunctions } from './rpc/index'

export const VITE_TASK_DEVTOOLS_BASE = '/__devtools-vite-task/'

export function DevToolsViteTaskUI(): PluginWithDevTools {
  return {
    name: 'vite:devtools:vite-task-ui',
    devtools: {
      setup(ctx) {
        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn as any)
        }

        ctx.views.hostStatic(
          VITE_TASK_DEVTOOLS_BASE,
          clientPublicDir,
        )

        ctx.docks.register({
          id: 'vite-task',
          title: 'Vite Task',
          groupId: 'viteplus',
          icon: `${VITE_TASK_DEVTOOLS_BASE}favicon.svg`,
          type: 'iframe',
          url: VITE_TASK_DEVTOOLS_BASE,
        })
      },
    },
  }
}
