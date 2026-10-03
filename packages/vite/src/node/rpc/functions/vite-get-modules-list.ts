import type { ViteInspectQuery } from '../../inspect/types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getViteInspectContext } from '../../inspect/context'
import { getAllQueryEnvs } from '../../inspect/utils'

export const viteGetModulesList = defineRpcFunction({
  name: 'vite:inspect:get-modules-list',
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
      handler: async (query: ViteInspectQuery) => ctx.queryEnv(query).getModulesList(),
    }
  },
})
