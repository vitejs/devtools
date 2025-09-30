import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import sirv from 'sirv'
import { clientPublicDir } from '../dirs'
import { rpcFunctions } from './rpc/index'

export function DevToolsViteUI(): PluginWithDevTools {
  return {
    name: 'vite:devtools',
    devtools: {
      setup(ctx) {
        console.log('Vite DevTools Vite plugin setup')

        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn)
        }

        // TODO: refactor into kit utils
        if (ctx.viteServer) {
          const handleStatic = sirv(clientPublicDir, {
            dev: true,
            single: false,
          })
          ctx.viteServer.middlewares.use('/__vite_devtools_ui__', handleStatic)
        }

        ctx.docks.register({
          id: 'vite',
          title: 'Vite',
          icon: 'https://vite.dev/logo.svg',
          type: 'iframe',
          url: '/__vite_devtools_ui__/',
        })
      },
    },
  }
}
