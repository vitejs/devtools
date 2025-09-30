import { addVitePlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import { DevTools } from '@vitejs/devtools'
import { rpcFunctions } from '../../node/rpc'

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
    addVitePlugin(DevTools())

    nuxt.hook('imports:dirs', (dirs) => {
      dirs.push(resolver.resolve('./runtime/composables'))
    })
  },
})
