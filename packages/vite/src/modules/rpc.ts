import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { DevToolsServer } from '../../../core/src/node/plugins/server'
import { createHmrTrackerPlugin } from '../node/hmr/plugin'
import { createHmrTracker } from '../node/hmr/tracker'
import { rpcFunctions } from '../node/rpc'

export default defineNuxtModule({
  meta: {
    name: 'devtools-rpc',
    configKey: 'devtoolsRpc',
  },
  setup() {
    const hmrTracker = createHmrTracker()

    addVitePlugin({
      name: 'vite:devtools:vite',
      devtools: {
        setup(ctx) {
          ;(ctx as any).__hmrTracker = hmrTracker
          for (const fn of rpcFunctions) {
            ctx.rpc.register(fn as any)
          }
        },
      },
    })

    addVitePlugin(createHmrTrackerPlugin(hmrTracker))

    addVitePlugin(DevToolsServer())
  },
})
