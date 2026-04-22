import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { clientPublicDir } from '../dirs'
import { rpcFunctions } from './rpc/index'

export function DevToolsSelfInspect(): PluginWithDevTools {
  return {
    name: 'vite:devtools:self-inspect',
    devtools: {
      setup(ctx) {
        for (const fn of rpcFunctions) {
          ctx.rpc.register(fn as any)
        }

        ctx.views.hostStatic(
          '/.devtools-self-inspect/',
          clientPublicDir,
        )

        ctx.docks.register({
          id: 'self-inspect',
          title: 'Self Inspect',
          category: 'advanced',
          icon: 'ph:stethoscope-duotone',
          type: 'iframe',
          url: '/.devtools-self-inspect/',
        })
      },
    },
  }
}
