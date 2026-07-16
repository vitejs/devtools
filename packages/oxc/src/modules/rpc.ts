import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { DevTools } from '@vitejs/devtools'
import { DevToolsOxc } from '../vite'

export default defineNuxtModule({
  meta: {
    name: 'devtools-rpc',
    configKey: 'devtoolsRpc',
  },
  async setup() {
    addVitePlugin(DevToolsOxc())

    const devtools = await DevTools({ builtinDevTools: false })
    addVitePlugin(devtools)
  },
})
