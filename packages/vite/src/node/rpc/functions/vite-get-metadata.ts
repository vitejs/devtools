import { defineRpcFunction } from '@vitejs/devtools-kit'
import { getViteInspectContext } from '../../inspect/context'

export const viteGetMetadata = defineRpcFunction({
  name: 'vite:inspect:get-metadata',
  type: 'query',
  jsonSerializable: true,
  cacheable: true,
  dump: async () => ({
    inputs: [[] satisfies []],
  }),
  setup: (devtoolsCtx) => {
    const ctx = getViteInspectContext(devtoolsCtx)
    return {
      handler: async () => ctx.getMetadata(),
    }
  },
})
