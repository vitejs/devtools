import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { clientPublicDir } from '../dirs'
import { rpcFunctions } from './rpc/index'

export function DevToolsViteUI(): PluginWithDevTools {
  return {
    name: 'vite:devtools:vite-ui',
    devtools: {
      setup(ctx) {
        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn)
        }

        ctx.views.hostStatic(
          '/.devtools-vite/',
          clientPublicDir,
        )

        ctx.docks.register({
          id: 'vite',
          title: 'Vite',
          icon: 'https://vite.dev/logo.svg',
          type: 'iframe',
          url: '/.devtools-vite/',
        })
      },
    },
  }
}
