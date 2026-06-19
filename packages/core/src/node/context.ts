import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { RpcFunctionsHost } from 'devframe/node'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import { DEVTOOLS_VITEPLUS_GROUP_ID } from '@vitejs/devtools-kit/constants'
import { createKitContext, createViteDevToolsHost } from '@vitejs/devtools-kit/node'
import { isObject } from 'devframe/node'
import { createDebug } from 'obug'
import { diagnostics } from './diagnostics'
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

  // Seed the built-in "Vite+" dock group. Integrations (Rolldown, etc.) opt in
  // by registering their dock with `groupId: DEVTOOLS_VITEPLUS_GROUP_ID`; the
  // group stays hidden until at least one member joins it.
  context.docks.register({
    id: DEVTOOLS_VITEPLUS_GROUP_ID,
    type: 'group',
    title: 'Vite+',
    icon: { light: 'builtin:vite-plus-core', dark: 'builtin:vite-plus-core' },
    defaultOrder: -1000,
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
      throw diagnostics.DTK0014({ name: plugin.name, cause: error })
    }
  }

  return context
}
