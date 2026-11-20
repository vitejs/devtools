import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import { isPackageExists } from 'local-pkg'
import { viteTaskDevframe } from './node/devframe'

export function DevToolsViteTaskUI(): PluginWithDevTools {
  const plugin = createPluginFromDevframe(viteTaskDevframe, {
    name: 'vite:devtools:vite-task-ui',
    dock: { groupId: 'viteplus' },
  })
  const setup = plugin.devtools!.setup
  plugin.devtools!.setup = async (ctx) => {
    // ctx.cwd is the resolved project root; the plugin factory may run from another directory.
    // options.setup runs after mounting, too late to prevent dock and RPC registration.
    if (!isPackageExists('vite-plus', { paths: [ctx.cwd] }))
      return
    await setup(ctx)
  }
  return plugin
}
