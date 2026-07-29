import type { ViteInspectQuery } from '../../inspect/types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getViteInspectContext } from '../../inspect/context'

export const viteGetPluginDetails = defineRpcFunction({
  name: 'vite:inspect:get-plugin-details',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  setup: (devtoolsCtx) => {
    const ctx = getViteInspectContext(devtoolsCtx)
    return {
      handler: async (query: ViteInspectQuery, id: string) => ctx.queryEnv(query).getPluginDetails(Number(id)),
    }
  },
})
