import type { HmrTracker } from '~~/node/hmr/tracker'
import { defineRpcFunction } from '@vitejs/devtools-kit'

/** Returns the current list of recorded HMR updates. */
export const viteHmrUpdates = defineRpcFunction({
  name: 'vite:hmr-updates',
  type: 'query',
  jsonSerializable: true,
  setup: (context) => {
    const tracker: HmrTracker | undefined = (context as any).__hmrTracker
    return {
      handler: async () => {
        return tracker?.getUpdates() ?? []
      },
    }
  },
})
