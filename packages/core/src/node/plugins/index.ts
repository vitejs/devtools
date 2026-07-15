import type { Plugin } from 'vite'
import { createInspectDevframe } from '@devframes/plugin-inspect'
import { createMessagesDevframe } from '@devframes/plugin-messages'
import { createTerminalsDevframe } from '@devframes/plugin-terminals'
import { DEVTOOLS_INSPECTOR_DOCK_ID } from '@vitejs/devtools-kit/constants'
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import { hideDockWhenEmpty } from './auto-hide'
import { DevToolsBuild } from './build'
import { DevToolsInjection } from './injection'
import { DevToolsServer } from './server'

export interface DevToolsOptions {
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

  const plugins = [
    DevToolsInjection(),
    DevToolsServer(),
  ]

  if (build?.withApp) {
    plugins.push(DevToolsBuild({ outDir: build.outDir }))
  }

  if (builtinDevTools) {
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-ignore ignore the type error
    plugins.push(await import('@vitejs/devtools-rolldown').then(m => m.DevToolsRolldownUI()))

    // Vite and Vitest join the same `~viteplus` dock group as Rolldown.
    // Vitest is a slim launcher that only appears when the project uses Vitest.
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-ignore ignore the type error
    plugins.push(...[await import('@vitejs/devtools-vite').then(m => m.DevToolsViteUI())].flat(Infinity))
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-ignore ignore the type error
    plugins.push(await import('@vitejs/devtools-vitest').then(m => m.DevToolsVitestUI()))
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
