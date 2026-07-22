import type { Plugin } from 'vite'
import process from 'node:process'
import { createInspectDevframe } from '@devframes/plugin-inspect'
import { createMessagesDevframe } from '@devframes/plugin-messages'
import { createTerminalsDevframe } from '@devframes/plugin-terminals'
import { DEVTOOLS_INSPECTOR_DOCK_ID, DEVTOOLS_VITEPLUS_GROUP_ID } from '@vitejs/devtools-kit/constants'
import { createInstallLauncher, createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import { isPackageExists } from 'local-pkg'
import { resolve } from 'pathe'
import { version } from '../../../package.json'
import { hideDockWhenEmpty } from './auto-hide'

const DEVTOOLS_ASSETS_BASE = '/__devtools-assets/'

interface BuiltinLauncherIntegration {
  /** Dock id, shared by the install launcher and the mounted integration. */
  id: string
  /** Package whose presence means the integration is already installed. */
  pkg: string
  /** Dock title. */
  title: string
  /** Launcher icon, a vendored mark served from `/__devtools-assets/`. */
  icon: string
  /** Dynamically import and instantiate the integration's Vite plugin(s). */
  load: () => Promise<Plugin[] | Plugin>
  /** Optional dock group for the launcher and integration. */
  groupId?: string
  /**
   * npm specs the launcher ensures are installed when clicked. Only the
   * packages that are actually missing get installed. The `@vitejs/devtools-*`
   * packages track core's version (`^${version}`); `@vitejs/devtools-oxc` is
   * versioned independently, so it floats to `latest`.
   */
  install: string[]
}

// The built-in integrations `DevTools()` advertises. Each is optional: when its
// package is installed, its real Vite plugin is dynamically imported and
// mounted; when absent, a discovery/install launcher is shown in its place.
// The dynamic imports are intentionally untyped (`@ts-ignore`) so core carries
// no compile-time dependency on these optional packages.
const BUILTIN_LAUNCHER_INTEGRATIONS: BuiltinLauncherIntegration[] = [
  {
    id: 'rolldown',
    pkg: '@vitejs/devtools-rolldown',
    title: 'Rolldown DevTools',
    icon: `${DEVTOOLS_ASSETS_BASE}rolldown.svg`,
    groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
    load: () =>
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-ignore optional integration, resolved at runtime only
      import('@vitejs/devtools-rolldown').then(m => m.DevToolsRolldownUI()),
    install: [`@vitejs/devtools-rolldown@^${version}`],
  },
  {
    id: 'vite',
    pkg: '@vitejs/devtools-vite',
    title: 'Vite DevTools',
    icon: `${DEVTOOLS_ASSETS_BASE}vite.svg`,
    groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
    load: () =>
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-ignore optional integration, resolved at runtime only
      import('@vitejs/devtools-vite').then(m => m.DevToolsViteUI()),
    install: [`@vitejs/devtools-vite@^${version}`],
  },
  {
    id: 'vitest',
    pkg: '@vitejs/devtools-vitest',
    title: 'Vitest UI',
    icon: `${DEVTOOLS_ASSETS_BASE}vitest.svg`,
    groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
    load: () =>
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-ignore optional integration, resolved at runtime only
      import('@vitejs/devtools-vitest').then(m => m.DevToolsVitestUI()),
    // Ensure the whole Vitest stack in one click; the launcher installs only
    // the missing subset, so bundling `@vitest/ui` here means the `-vitest`
    // launcher lands on a clean "Start Vitest UI" after the restart.
    install: ['vitest', `@vitejs/devtools-vitest@^${version}`, '@vitest/ui'],
  },
  {
    id: 'oxc',
    pkg: '@vitejs/devtools-oxc',
    title: 'Oxc DevTools',
    icon: `${DEVTOOLS_ASSETS_BASE}oxc.svg`,
    groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
    load: () =>
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-ignore optional integration, resolved at runtime only
      import('@vitejs/devtools-oxc/vite').then(m => m.DevToolsOxc()),
    install: ['@vitejs/devtools-oxc@latest'],
  },
]

/**
 * Set up the built-in DevTools dock entries (Terminals, Messages, Inspector) and
 * the built-in integration launchers (Rolldown, Vite, Vitest, Oxc).
 */
export async function DevToolsBuiltin(options: {
  cwd?: string
  builtinDevTools?: boolean
}): Promise<Plugin[]> {
  const plugins: (Plugin | Promise<Plugin[] | Plugin>)[] = []

  // When the built-in DevTools UI is disabled, contribute nothing: the host
  // mounts its own built-in docks (terminals / messages / inspector) and
  // integrations by hand. Mounting them here too would double-register each
  // devframe on the hub (DF8105) and its RPC functions (DF0021).
  if (!options.builtinDevTools)
    return []

  const cwd = resolve(options.cwd ?? process.cwd())
  const launchers: BuiltinLauncherIntegration[] = []
  for (const integration of BUILTIN_LAUNCHER_INTEGRATIONS) {
    if (isPackageExists(integration.pkg, { paths: [cwd] })) {
      plugins.push(integration.load())
    }
    else {
      launchers.push(integration)
    }
  }

  plugins.push({
    name: 'vite:devtools:builtin',
    enforce: 'pre',
    devtools: {
      async setup(ctx) {
        const plugins: Plugin[] = []

        // Terminals, messages, and the inspector are first-party tooling, so they
        // live in the `~builtin` dock category — alongside the built-in Settings
        // dock — rather than the `viteplus` group (which collects integrations
        // like Rolldown). The hub synthesizes no docks of its own; these
        // plugin-mounted iframe docks are the terminals / messages tabs.
        //
        // An empty messages feed should hide its tab, so we attach that rule here —
        // the dock is filtered out of the bar (`when: 'false'`) whenever there are
        // no messages.
        const terminalsDevframe = createTerminalsDevframe()
        const messagesDevframe = createMessagesDevframe()
        const inspectDevframe = createInspectDevframe({ id: DEVTOOLS_INSPECTOR_DOCK_ID })

        plugins.push(createPluginFromDevframe(terminalsDevframe, {
          dock: { category: '~builtin' },
        }))
        plugins.push(createPluginFromDevframe(messagesDevframe, {
          dock: { category: '~builtin' },
          setup(ctx) {
            hideDockWhenEmpty(ctx, messagesDevframe.id, () => ctx.messages.entries.size === 0)
          },
        }))
        // Meta-introspection ("DevTools for the DevTools"), provided by the
        // official devframe inspector plugin (replaces the former
        // `@vitejs/devtools-self-inspect` package). Pinned to a stable id so the
        // client can gate it behind the `showDevframeInspector` user setting;
        // hidden by default (opt in via Settings → Advanced).
        plugins.push(createPluginFromDevframe(inspectDevframe, {
          dock: { category: '~builtin', icon: 'ph:stethoscope-duotone' },
        }))

        for (const integration of launchers) {
          plugins.push(createInstallLauncher({
            id: integration.id,
            title: integration.title,
            icon: integration.icon,
            groupId: integration.groupId ?? undefined,
            install: integration.install,
            label: integration.title,
            pkg: integration.pkg,
          }))
        }

        for (const plugin of plugins) {
          await plugin.devtools?.setup?.(ctx)
        }
      },
    },
  })

  return Promise.all(plugins).then(arr => arr.flat(Infinity) as Plugin[])
}
