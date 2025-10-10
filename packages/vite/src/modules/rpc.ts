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
      // @ts-expect-error TODO: fix types
      devtools: {
        // @ts-expect-error TODO: fix types
        setup(ctx) {
          for (const fn of rpcFunctions) {
            ctx.rpc.register(fn)
          }
        },
      },
    })

    // @ts-expect-error TODO: fix types
    addVitePlugin(DevToolsServer())

    nuxt.hook('imports:dirs', (dirs) => {
      dirs.push(resolver.resolve('./runtime/composables'))
    })
  },
})
