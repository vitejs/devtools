import type { ViteInspectQuery } from '../../inspect/types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getViteInspectContext } from '../../inspect/context'
import { getAllModuleIds } from '../../inspect/utils'

export const viteResolveId = defineRpcFunction({
  name: 'vite:inspect:resolve-id',
  type: 'query',
  jsonSerializable: true,
  dump: async (devtoolsCtx) => {
    const ctx = getViteInspectContext(devtoolsCtx)
    return {
      inputs: getAllModuleIds(ctx).map(([query, id]) => [query, id] satisfies [ViteInspectQuery, string]),
    }
  },
  setup: (devtoolsCtx) => {
    const ctx = getViteInspectContext(devtoolsCtx)
    return {
      handler: async (query: ViteInspectQuery, id: string) => ctx.queryEnv(query).resolveId(id),
    }
  },
})
