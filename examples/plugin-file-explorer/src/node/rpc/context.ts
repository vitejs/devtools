import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { KitPluginFileExplorerResolvedOptions } from '../types'

const fileExplorerOptions = new WeakMap<ViteDevToolsNodeContext, KitPluginFileExplorerResolvedOptions>()

export function setFileExplorerOptions(
  context: ViteDevToolsNodeContext,
  options: KitPluginFileExplorerResolvedOptions,
): void {
  fileExplorerOptions.set(context, options)
}

export function getFileExplorerOptions(context: ViteDevToolsNodeContext): KitPluginFileExplorerResolvedOptions {
  const options = fileExplorerOptions.get(context)
  if (!options) {
    throw new Error('[kit-plugin-file-explorer] Missing plugin options in context. Ensure setup calls setFileExplorerOptions(context, options) before registering RPC functions.')
  }
  return options
}
