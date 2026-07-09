import type { Plugin } from 'vite'
import { createInspectDevframe } from '@devframes/plugin-inspect'
import { createMessagesDevframe } from '@devframes/plugin-messages'
import { createTerminalsDevframe } from '@devframes/plugin-terminals'
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
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

    // Terminals, messages, and the inspector are first-party tooling, so they
    // live in the `~builtin` dock category — alongside the built-in Settings
    // dock — rather than the `~viteplus` group (which collects integrations
    // like Rolldown). The hub's own `~terminals` / `~messages` docks are
    // suppressed via `builtinDocks` in `createDevToolsContext`.
    plugins.push(createPluginFromDevframe(createTerminalsDevframe(), {
      dock: { category: '~builtin' },
    }))
    plugins.push(createPluginFromDevframe(createMessagesDevframe(), {
      dock: { category: '~builtin' },
    }))

    // Meta-introspection ("DevTools for the DevTools"), provided by the
    // official devframe inspector plugin (replaces the former
    // `@vitejs/devtools-self-inspect` package).
    plugins.push(createPluginFromDevframe(createInspectDevframe(), {
      dock: { category: '~builtin', icon: 'ph:stethoscope-duotone' },
    }))
  }

  return plugins
}

export {
  DevToolsBuild,
  DevToolsInjection,
  DevToolsServer,
}
