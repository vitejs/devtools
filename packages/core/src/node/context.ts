import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { RpcFunctionsHost } from 'devframe/node'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import { createKitContext, createViteDevToolsHost } from '@vitejs/devtools-kit/node'
import { isObject } from 'devframe/node'
import { createDebug } from 'obug'
import { diagnostics, logger } from './diagnostics'
import { builtinRpcDeclarations } from './rpc'

const debugSetup = createDebug('vite:devtools:context:setup')

function shouldSkipSetupByCapabilities(
  plugin: ResolvedConfig['plugins'][number],
  mode: 'dev' | 'build',
): boolean {
  const modeCapabilities = plugin.devtools?.capabilities?.[mode]
  if (modeCapabilities === false)
    return true
  if (!isObject(modeCapabilities))
    return false
  return Object.values(modeCapabilities).includes(false)
}

export async function createDevToolsContext(
  viteConfig: ResolvedConfig,
  viteServer?: ViteDevServer,
): Promise<ViteDevToolsNodeContext> {
  const cwd = viteConfig.root

  const { searchForWorkspaceRoot } = await import('vite')
  const mode = viteConfig.command === 'serve' ? 'dev' : 'build'
  const workspaceRoot = searchForWorkspaceRoot(cwd) ?? cwd

  const context = (await createKitContext({
    cwd,
    workspaceRoot,
    mode,
    host: createViteDevToolsHost({ viteConfig, viteServer, workspaceRoot }),
    builtinRpcDeclarations,
    viteConfig,
    viteServer,
  })) as ViteDevToolsNodeContext

  // Fold the core (Vite) diagnostics into the shared host logger so plugin
  // setup() hooks can reference DTK codes via `ctx.diagnostics.logger`.
  context.diagnostics.register(diagnostics)

  // Vite-specific built-in server commands.
  const rpcHost = context.rpc as RpcFunctionsHost
  context.commands.register({
    id: 'vite:open-in-editor',
    title: 'Open in Editor',
    icon: 'ph:pencil-duotone',
    category: 'editor',
    showInPalette: false,
    handler: (path: string) => rpcHost.invokeLocal('vite:core:open-in-editor', path),
  })
  context.commands.register({
    id: 'vite:open-in-finder',
    title: 'Open in Finder',
    icon: 'ph:folder-open-duotone',
    category: 'editor',
    showInPalette: false,
    handler: (path: string) => rpcHost.invokeLocal('vite:core:open-in-finder', path),
  })

  // Scan Vite plugins for `devtools` setup hooks.
  const plugins = viteConfig.plugins.filter(plugin => 'devtools' in plugin)
  for (const plugin of plugins) {
    if (!plugin.devtools?.setup)
      continue
    if (shouldSkipSetupByCapabilities(plugin, mode)) {
      debugSetup(`skipping plugin ${JSON.stringify(plugin.name)} due to disabled capabilities in ${mode} mode`)
      continue
    }
    try {
      debugSetup(`setting up plugin ${JSON.stringify(plugin.name)}`)
      await plugin.devtools?.setup?.(context)
    }
    catch (error) {
      throw logger.DTK0014({ name: plugin.name }, { cause: error }).throw()
    }
  }

  return context
}
