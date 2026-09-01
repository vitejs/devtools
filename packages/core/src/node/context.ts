import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { RpcFunctionsHost } from 'devframe/node'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import { createKitContext, createViteDevToolsHost } from '@vitejs/devtools-kit/node'
import { createDebug } from 'obug'
import { DEVTOOLS_ASSETS_BASE, dirAssets } from '../dirs'
import { getAuthHandler, isClientAuthDisabled } from './auth-handler'
import { diagnostics } from './diagnostics'
import { builtinRpcDeclarations } from './rpc'

const debugSetup = createDebug('vite:devtools:context:setup')

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

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
  // one-time-code banner are wired up by `initHub`'s `auth` option (same
  // handler) in `createDevToolsHub`. This also covers implicit build mode,
  // where the same handler additionally trusts the per-process capability
  // token (its banner suppressed) — see `getAuthHandler` /
  // `isBuildCapabilityAuth`. Skipped only when the gate is fully disabled
  // (`isClientAuthDisabled`) — leaving `anonymous:devframe:auth` unregistered
  // lets devframe's `auth: false` auto-trust shim (armed by `createDevToolsHub`
  // passing `auth: false` to `initHub`) register its own noop handler and mark
  // sessions trusted, instead of the interactive handler winning the race and
  // leaving every session stuck untrusted.
  if (!isClientAuthDisabled(context)) {
    for (const fn of getAuthHandler(context).rpcFunctions)
      rpcHost.register(fn)
  }

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
  // by registering their dock with `groupId: 'viteplus'`; the
  // group stays hidden until at least one member joins it.
  context.docks.register({
    id: 'viteplus',
    type: 'group',
    title: 'Vite+',
    category: 'framework',
    icon: `${DEVTOOLS_ASSETS_BASE}vite-plus.svg`,
  }, true)

  // Serve the vendored integration marks used by the built-in install
  // launchers (`DevTools()`), so a launcher icon renders before its
  // integration package — and that package's own served favicon — exists.
  // Dev-mode static hosting needs a live server; skip it when the context is
  // built without one (build mode serves statics without a server).
  if (viteServer || mode === 'build')
    context.views.hostStatic(DEVTOOLS_ASSETS_BASE, dirAssets)

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
