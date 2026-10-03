import type { ViteInspectQuery } from '../../inspect/types'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getViteInspectContext } from '../../inspect/context'
import {
  getViteInspectModuleUpdatedState,
  notifyViteInspectModuleUpdated,
} from '../inspect-module-updated'

export const viteClearModuleTransform = defineRpcFunction({
  name: 'vite:inspect:clear-module-transform',
  type: 'action',
  jsonSerializable: true,
  setup: async (devtoolsCtx) => {
    const ctx = getViteInspectContext(devtoolsCtx)
    const moduleUpdatedState = await getViteInspectModuleUpdatedState(devtoolsCtx)
    return {
      handler: async (query: ViteInspectQuery, id: string) => {
        await ctx.queryEnv(query).clearModuleTransform(id)
        notifyViteInspectModuleUpdated(moduleUpdatedState, [id])
      },
    }
  },
})
