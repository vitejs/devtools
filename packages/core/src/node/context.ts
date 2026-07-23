import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { RpcFunctionsHost } from 'devframe/node'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import { DEVTOOLS_VITEPLUS_GROUP_ID } from '@vitejs/devtools-kit/constants'
import { createKitContext, createViteDevToolsHost } from '@vitejs/devtools-kit/node'
import { isObject } from 'devframe/node'
import { createDebug } from 'obug'
import { dirAssets } from '../dirs'
import { getAuthHandler } from './auth-handler'
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

  // The hub no longer synthesizes built-in docks — Vite DevTools, as the
  // high-level integration, registers the viewer's native views it wants. The
  // terminals + messages panels come from the official `@devframes/plugin-terminals`
  // / `@devframes/plugin-messages` devframes (mounted in `DevTools()`), so only the
  // Settings tab is registered here. A `~builtin` view defaults its category to
  // `~builtin`, so this Settings tab sorts last on its own.
  context.docks.register({
    type: '~builtin',
    id: '~settings',
    category: '~builtin',
    title: 'Settings',
    icon: 'ph:gear-duotone',
    defaultOrder: 1000_000,
  })

  const rpcHost = context.rpc as RpcFunctionsHost

  // Interactive OTP auth, provided by devframe's `createInteractiveAuth`
  // recipe: registers the `anonymous:devframe:auth` / `:exchange` handshake
  // and the `devframe:auth:revoke` self-revoke. The resolver gate and the
  // one-time-code banner are wired up in `createWsServer` (same handler).
  for (const fn of getAuthHandler(context).rpcFunctions)
    rpcHost.register(fn)

  // Vite-specific built-in server commands.
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
    category: 'framework',
    icon: { light: 'builtin:vite-plus-core', dark: 'builtin:vite-plus-core' },
  })

  // Serve the vendored integration marks used by the built-in install
  // launchers (`DevTools()`), so a launcher icon renders before its
  // integration package — and that package's own served favicon — exists.
  // Dev-mode static hosting needs a live server; skip it when the context is
  // built without one (build mode serves statics without a server).
  if (viteServer || mode === 'build')
    context.views.hostStatic('/__devtools-assets/', dirAssets)

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
