import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { clientPublicDir } from '../dirs'
import { rpcFunctions } from './rpc/index'

export function DevToolsRolldownUI(): PluginWithDevTools {
  return {
    name: 'vite:devtools:rolldown-ui',
    devtools: {
      setup(ctx) {
        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn)
        }

        ctx.views.hostStatic(
          '/.devtools-rolldown/',
          clientPublicDir,
        )

        ctx.docks.register({
          id: 'rolldown',
          title: 'Rolldown',
          category: '~viteplus',
          icon: 'https://viteplus.dev/projects/rolldown.svg',
          type: 'iframe',
          url: '/.devtools-rolldown/',
        })
      },
    },
  }
}
