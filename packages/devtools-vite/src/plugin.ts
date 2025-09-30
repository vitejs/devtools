import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { rpcFunctions } from './node/rpc/index'

export function DevToolsViteUI(): PluginWithDevTools {
  return {
    name: 'vite:devtools',
    devtools: {
      setup(ctx) {
        // eslint-disable-next-line no-console
        console.log('Vite DevTools Vite plugin setup')
        ctx.docks.register({
          id: 'vite',
          title: 'Vite',
          icon: 'https://vite.dev/logo.svg',
          type: 'iframe',
          url: 'https://antfu.me',
        })

        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn)
        }
      },
    },
  }
}
