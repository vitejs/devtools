import { addVitePlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import { DevToolsServer } from '../../../core/src/node/plugins/server'
import { rpcFunctions } from '../node/rpc'

export default defineNuxtModule({
  meta: {
    name: 'devtools-rpc',
    configKey: 'devtoolsRpc',
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    addVitePlugin({
      name: 'vite:devtools',
      devtools: {
        setup(ctx) {
          for (const fn of rpcFunctions) {
            ctx.rpc.register(fn)
          }
        },
      },
    })

    addVitePlugin(DevToolsServer())

    nuxt.hook('imports:dirs', (dirs) => {
      dirs.push(resolver.resolve('./runtime/composables'))
    })
  },
})
