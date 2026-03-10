import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import type { KitPluginFileExplorerOptions } from './types'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'pathe'
import { createFileExplorerRpcFunctions } from './rpc'
import { resolveTargetDir, resolveUiBase } from './utils'

export { DEFAULT_TARGET_DIR, DEFAULT_UI_BASE } from './constants'
export { resolveUiBase } from './utils'

export function createKitPluginFileExplorerDevToolsPlugin(options: KitPluginFileExplorerOptions = {}): PluginWithDevTools {
  const uiBase = resolveUiBase(options.uiBase)
  const targetDir = resolveTargetDir(options.targetDir)
  const rpcFunctions = createFileExplorerRpcFunctions(targetDir)

  return {
    name: 'kit-plugin-file-explorer-devtools',
    devtools: {
      setup(context) {
        const distFromBundle = fileURLToPath(new URL('./ui', import.meta.url))
        const distFromSource = fileURLToPath(new URL('../../dist/ui', import.meta.url))
        const iframeDist = fs.existsSync(distFromBundle) ? distFromBundle : distFromSource

        for (const fn of rpcFunctions) {
          context.rpc.register(fn)
        }

        context.views.hostStatic(uiBase, resolve(iframeDist))
        context.docks.register({
          id: 'kit-plugin-file-explorer:file-explorer',
          title: 'File Explorer',
          icon: 'ph:folder-open-duotone',
          type: 'iframe',
          url: uiBase,
        })
      },
    },
  }
}

export default createKitPluginFileExplorerDevToolsPlugin
