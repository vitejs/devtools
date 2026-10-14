import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { rpcFunctions } from '../node/rpc'

export default defineNuxtModule({
  meta: {
    name: 'devtools-rpc',
    configKey: 'devtoolsRpc',
  },
  setup() {
    addVitePlugin({
      name: 'vite:devtools:rolldown',
      devtools: {
        setup(ctx) {
          for (const fn of rpcFunctions) {
            ctx.rpc.register(fn as any)
          }
        },
      },
    })
  },
})
