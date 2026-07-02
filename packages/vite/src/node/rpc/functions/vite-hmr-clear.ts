import type { HmrTracker } from '../..//hmr/tracker'
import { defineRpcFunction } from '@vitejs/devtools-kit'

/** Clears the recorded HMR update history. */
export const viteHmrClear = defineRpcFunction({
  name: 'vite:hmr-clear',
  type: 'action',
  jsonSerializable: true,
  setup: (context) => {
    const tracker: HmrTracker | undefined = (context as any).__hmrTracker
    return {
      handler: async () => {
        tracker?.clear()
      },
    }
  },
})
