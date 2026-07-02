import type { ViteInspectQuery } from '../../inspect/types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getViteInspectContext } from '../../inspect/context'

export const viteClearModuleTransform = defineRpcFunction({
  name: 'vite:inspect:clear-module-transform',
  type: 'action',
  jsonSerializable: true,
  setup: (devtoolsCtx) => {
    const ctx = getViteInspectContext(devtoolsCtx)
    return {
      handler: async (query: ViteInspectQuery, id: string) => {
        await ctx.queryEnv(query).clearModuleTransform(id)
      },
    }
  },
})
