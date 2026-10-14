import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { DevToolsViteInspect } from '../node/inspect/plugin'

export default defineNuxtModule({
  meta: {
    name: 'devtools-rpc',
    configKey: 'devtoolsRpc',
  },
  setup() {
    addVitePlugin(DevToolsViteInspect())
  },
})
