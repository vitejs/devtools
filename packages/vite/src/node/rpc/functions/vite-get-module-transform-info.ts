import type { ViteInspectQuery } from '../../inspect/types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getViteInspectContext } from '../../inspect/context'
import { getAllModuleIds } from '../../inspect/utils'

export const viteGetModuleTransformInfo = defineRpcFunction({
  name: 'vite:inspect:get-module-transform-info',
  type: 'query',
  jsonSerializable: true,
  dump: async (devtoolsCtx) => {
    const ctx = getViteInspectContext(devtoolsCtx)
    const moduleIds = await getAllModuleIds(ctx)
    return {
      inputs: moduleIds.map(([query, id]) => [query, id] satisfies [ViteInspectQuery, string]),
    }
  },
  setup: (devtoolsCtx) => {
    const ctx = getViteInspectContext(devtoolsCtx)
    return {
      handler: async (query: ViteInspectQuery, id: string) => ctx.queryEnv(query).getModuleTransformInfo(id),
    }
  },
})
