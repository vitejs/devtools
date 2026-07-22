import type { ViteInspectQuery } from '../../inspect/types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getViteInspectContext } from '../../inspect/context'
import { getAllQueryEnvs } from '../../inspect/utils'

export const viteGetServerMetrics = defineRpcFunction({
  name: 'vite:inspect:get-server-metrics',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  dump: async (devtoolsCtx) => {
    const ctx = getViteInspectContext(devtoolsCtx)
    return {
      inputs: getAllQueryEnvs(ctx).map(query => [query] satisfies [ViteInspectQuery]),
    }
  },
  setup: (devtoolsCtx) => {
    const ctx = getViteInspectContext(devtoolsCtx)
    return {
      handler: async (query: ViteInspectQuery) => ctx.getViteContext(query.vite).data.serverMetrics,
    }
  },
})
