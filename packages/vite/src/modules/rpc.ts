import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { DevToolsServer } from '../../../core/src/node/plugins/server'
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

    addVitePlugin({
      name: 'vite:devtools:hmr-tracker',
      hotUpdate({ file, modules, timestamp }) {
        if (modules.length > 0) {
          hmrTracker.record({
            timestamp,
            type: 'update',
            files: [file],
            modules: modules.map(m => m.id ?? m.url),
          })
        }
      },
    })

    addVitePlugin(DevToolsServer())
  },
})
