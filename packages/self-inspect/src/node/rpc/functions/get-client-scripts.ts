import type { ClientScriptInfo } from '../../../types'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const getClientScripts = defineRpcFunction({
  name: 'devtoolskit:self-inspect:get-client-scripts',
  type: 'query',
  setup: (context) => {
    return {
      handler: async () => {
        const scripts: ClientScriptInfo[] = []
        for (const dock of context.docks.values()) {
          if (dock.type === 'action') {
            scripts.push({
              dockId: dock.id,
              dockTitle: dock.title,
              dockType: dock.type,
              script: dock.action,
            })
          }
          else if (dock.type === 'custom-render') {
            scripts.push({
              dockId: dock.id,
              dockTitle: dock.title,
              dockType: dock.type,
              script: dock.renderer,
            })
          }
          else if (dock.type === 'iframe' && dock.clientScript) {
            scripts.push({
              dockId: dock.id,
              dockTitle: dock.title,
              dockType: dock.type,
              script: dock.clientScript,
            })
          }
        }
        return scripts
      },
    }
  },
})
