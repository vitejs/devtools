import { launchEditor } from 'devframe/utils/launch-editor'
import { defineOxcRpc } from '../_define'

/**
 * Open a file in the user's editor. `target` may be a plain path, `file:line`,
 * or `file:line:column`. Portable across runtimes (embedded in Vite DevTools
 * and standalone devframe CLI), so the client never depends on host-provided
 * commands like `vite:core:open-in-editor`.
 */
export const openInEditor = defineOxcRpc({
  name: 'devtools-oxc:open-in-editor',
  type: 'action',
  setup: () => {
    return {
      handler: async (target: string) => {
        launchEditor(target)
      },
    }
  },
})
