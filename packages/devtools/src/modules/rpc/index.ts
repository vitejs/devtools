import { addPlugin, addServerHandler, createResolver, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'devtools-rpc',
    configKey: 'devtoolsRpc',
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    addServerHandler({
      route: '/api/metadata.json',
      method: 'get',
      handler: resolver.resolve('./runtime/server/metadata.ts'),
      env: 'dev',
    })

    addPlugin({
      src: resolver.resolve('./runtime/plugin.ts'),
      mode: 'client',
    })

    nuxt.hook('imports:dirs', (dirs) => {
      dirs.push(resolver.resolve('./runtime/composables'))
    })
  },
})
