import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { clientPublicDir } from '../dirs'
import { rpcFunctions } from './rpc/index'

export function DevToolsViteUI(): PluginWithDevTools {
  return {
    name: 'vite:devtools:vite-ui',
    devtools: {
      setup(ctx) {
        console.log('Vite DevTools Vite plugin setup')

        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn)
        }

        ctx.hostStatic('/__vite_devtools_vite__/', clientPublicDir)

        ctx.docks.register({
          id: 'vite',
          title: 'Vite',
          icon: 'https://vite.dev/logo.svg',
          type: 'iframe',
          url: '/__vite_devtools_vite__/',
        })
      },
    },
  }
}
