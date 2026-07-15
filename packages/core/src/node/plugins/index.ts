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
import { DevToolsBuild } from './build'
import { DevToolsInjection } from './injection'
import { DevToolsServer } from './server'

const DEVTOOLS_ASSETS_BASE = '/__devtools-assets/'

interface BuiltinIntegration {
  /** Dock id, shared by the install launcher and the mounted integration. */
  id: string
  /** Package whose presence means the integration is already installed. */
  pkg: string
  /** Dock title. */
  title: string
  /** Launcher icon, a vendored mark served from `/__devtools-assets/`. */
  icon: string
  /** Dynamically import and instantiate the integration's Vite plugin(s). */
  load: () => Promise<Plugin[]>
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
const BUILTIN_INTEGRATIONS: BuiltinIntegration[] = [
  {
    id: 'rolldown',
    pkg: '@vitejs/devtools-rolldown',
    title: 'Rolldown',
    icon: `${DEVTOOLS_ASSETS_BASE}rolldown.svg`,
    load: () =>
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-ignore optional integration, resolved at runtime only
      import('@vitejs/devtools-rolldown').then(m => [m.DevToolsRolldownUI()]),
    install: [`@vitejs/devtools-rolldown@^${version}`],
  },
  {
    id: 'vite',
    pkg: '@vitejs/devtools-vite',
    title: 'Vite',
    icon: `${DEVTOOLS_ASSETS_BASE}vite.svg`,
    load: () =>
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-ignore optional integration, resolved at runtime only
      import('@vitejs/devtools-vite').then(m => [m.DevToolsViteUI()].flat(Infinity) as Plugin[]),
    install: [`@vitejs/devtools-vite@^${version}`],
  },
  {
    id: 'vitest',
    pkg: '@vitejs/devtools-vitest',
    title: 'Vitest',
    icon: `${DEVTOOLS_ASSETS_BASE}vitest.svg`,
    load: () =>
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-ignore optional integration, resolved at runtime only
      import('@vitejs/devtools-vitest').then(m => [m.DevToolsVitestUI()]),
    // Ensure the whole Vitest stack in one click; the launcher installs only
    // the missing subset, so bundling `@vitest/ui` here means the `-vitest`
    // launcher lands on a clean "Start Vitest UI" after the restart.
    install: ['vitest', `@vitejs/devtools-vitest@^${version}`, '@vitest/ui'],
  },
  {
    id: 'oxc',
    pkg: '@vitejs/devtools-oxc',
    title: 'Oxc',
    icon: `${DEVTOOLS_ASSETS_BASE}oxc.svg`,
    load: () =>
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-ignore optional integration, resolved at runtime only
      import('@vitejs/devtools-oxc/vite').then(m => [m.DevToolsOxc()]),
    install: ['@vitejs/devtools-oxc@latest'],
  },
]

export interface DevToolsOptions {
  /** Directory to search for installed integrations. */
  cwd?: string
  /**
   * Include the Vite builtin devtools UI.
   *
   * @default true
   */
  builtinDevTools?: boolean

  /**
   * Options for building static DevTools output alongside `vite build`.
   */
  build?: {
    /**
     * Automatically build DevTools when running `vite build`.
     *
     * @default false
     */
    withApp?: boolean
    /**
     * Output directory for the DevTools build (relative to root).
     * Defaults to Vite's `build.outDir`.
     */
    outDir?: string
  }
}

export async function DevTools(options: DevToolsOptions = {}): Promise<Plugin[]> {
  const {
    builtinDevTools = true,
    build,
  } = options
  const cwd = resolve(options.cwd ?? process.cwd())

  const plugins = [
    DevToolsInjection(),
    DevToolsServer(),
  ]

  if (build?.withApp) {
    plugins.push(DevToolsBuild({ outDir: build.outDir }))
  }

  if (builtinDevTools) {
    // Vite DevTools ships as a dependency-light shell: it advertises the
    // built-in integrations (Rolldown, Vite, Vitest, Oxc — all in the
    // `~viteplus` dock group) without depending on their packages. When a
    // package is installed, its real plugin is mounted; when absent, a
    // discovery launcher is shown that installs it on demand, then prompts a
    // restart so the next config resolution mounts the real plugin.
    for (const integration of BUILTIN_INTEGRATIONS) {
      if (isPackageExists(integration.pkg, { paths: [cwd] })) {
        plugins.push(...await integration.load())
      }
      else {
        plugins.push(createInstallLauncher({
          id: integration.id,
          title: integration.title,
          icon: integration.icon,
          groupId: DEVTOOLS_VITEPLUS_GROUP_ID,
          label: `${integration.title} DevTools`,
          install: integration.install,
        }))
      }
    }
  }

  // Terminals, messages, and the inspector are first-party tooling, so they
  // live in the `~builtin` dock category — alongside the built-in Settings
  // dock — rather than the `~viteplus` group (which collects integrations
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

  return plugins
}

export {
  DevToolsBuild,
  DevToolsInjection,
  DevToolsServer,
}
