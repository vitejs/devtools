import type { ViteInspectQuery } from '../../inspect/types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getViteInspectContext } from '../../inspect/context'
import { getAllModuleIds } from '../../inspect/utils'

export const viteResolveId = defineRpcFunction({
  name: 'vite:inspect:resolve-id',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
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
      handler: async (query: ViteInspectQuery, id: string) => ctx.queryEnv(query).resolveId(id),
    }
  },
})
