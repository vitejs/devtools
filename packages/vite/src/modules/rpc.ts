import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { DevToolsServer } from '../../../core/src/node/plugins/server'
import { DevToolsViteInspect } from '../node/inspect/plugin'

export default defineNuxtModule({
  meta: {
    name: 'devtools-rpc',
    configKey: 'devtoolsRpc',
  },
  setup() {
    addVitePlugin(DevToolsViteInspect())
    addVitePlugin(DevToolsServer())
  },
})
