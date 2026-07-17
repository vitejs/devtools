import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import { DEVTOOLS_VITEPLUS_GROUP_ID } from '@vitejs/devtools-kit/constants'
import { oxcDevframe } from './node/devframe'
import { enableOxlintRun } from './node/rpc/functions/oxlint-capabilities'
import { viteRpcFunctions } from './node/rpc'

/**
 * Mount the Oxc DevTools inside Vite DevTools. Delegates to kit's
 * `createPluginFromDevframe`, which serves the SPA, synthesizes the iframe dock
 * entry from the definition metadata, and runs `oxcDevframe.setup(ctx)`.
 */
export function DevToolsOxc(): PluginWithDevTools {
  return createPluginFromDevframe(oxcDevframe, {
    name: 'devtools-oxc',
    dock: {
      groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
    },
    setup(ctx) {
      enableOxlintRun(ctx)
      for (const fn of viteRpcFunctions) ctx.rpc.register(fn)
    },
  })
}
