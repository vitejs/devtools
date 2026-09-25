import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { DevToolsServer } from '../../../core/src/node/plugins/server'
import { rpcFunctions } from '../node/rpc'

// `@nuxt/kit` types `addVitePlugin` against whatever `vite` install pnpm
// resolves for its own peer chain, which can differ from the one our
// plugins are built against even on the same `vite` version — cast past
// the resulting structural mismatch.
function addDevToolsVitePlugin<T extends { name: string }>(plugin: T): void {
  addVitePlugin(plugin as unknown as Parameters<typeof addVitePlugin>[0])
}

export default defineNuxtModule({
  meta: {
    name: 'devtools-rpc',
    configKey: 'devtoolsRpc',
  },
  setup() {
    const rpcPlugin: PluginWithDevTools = {
      name: 'vite:devtools:rolldown',
      devtools: {
        setup(ctx) {
          for (const fn of rpcFunctions) {
            ctx.rpc.register(fn as any)
          }
        },
      },
    }
    addDevToolsVitePlugin(rpcPlugin)

    addDevToolsVitePlugin(DevToolsServer())
  },
})
