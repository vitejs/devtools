import type { KitNodeContext } from '@vitejs/devtools-kit/node'
import type { Plugin } from 'vite'
import { createInspectDevframe } from '@devframes/plugin-inspect'
import { createMessagesDevframe } from '@devframes/plugin-messages'
import { createTerminalsDevframe } from '@devframes/plugin-terminals'
import { DEVTOOLS_INSPECTOR_DOCK_ID } from '@vitejs/devtools-kit/constants'
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
    //
    // The hub's built-in `~terminals` / `~messages` docks auto-hid themselves
    // when empty; the plugin-mounted iframe docks that replaced them carry no
    // such rule, so we restore it here — the dock is filtered out of the bar
    // (`when: 'false'`) whenever there are no sessions / messages.
    const terminalsDevframe = createTerminalsDevframe()
    plugins.push(createPluginFromDevframe(terminalsDevframe, {
      dock: { category: '~builtin' },
      setup(ctx) {
        hideDockWhenEmpty(ctx, terminalsDevframe.id, () => ctx.terminals.sessions.size === 0)
      },
    }))
    const messagesDevframe = createMessagesDevframe()
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
    plugins.push(createPluginFromDevframe(createInspectDevframe({ id: DEVTOOLS_INSPECTOR_DOCK_ID }), {
      dock: { category: '~builtin', icon: 'ph:stethoscope-duotone' },
    }))
  }

  return plugins
}

/**
 * Keep a dock entry out of the dock bar while its backing collection is empty.
 *
 * Mirrors the hub's built-in `~terminals` / `~messages` docks: attaches a live
 * `when` getter to the registered entry that resolves to `'false'`
 * (unconditionally hidden) while `isEmpty()` and `undefined` (visible)
 * otherwise. The hub already re-serializes the dock shared state on every
 * terminal / message change, so the getter is re-read at exactly the right
 * moments — no explicit event subscription needed here.
 *
 * TODO: once devframe/hub ships first-class support for a functional `when`
 * (`when?: () => string | boolean | undefined`, resolved during dock
 * serialization), this can become a plain `dock: { when: () => ... }` option
 * on `createPluginFromDevframe` and the getter trick can be deleted.
 */
function hideDockWhenEmpty(
  ctx: KitNodeContext,
  dockId: string,
  isEmpty: () => boolean,
): void {
  const view = ctx.docks.views.get(dockId)
  if (!view)
    return
  Object.defineProperty(view, 'when', {
    enumerable: true,
    configurable: true,
    get: () => (isEmpty() ? 'false' : undefined),
  })
}

export {
  DevToolsBuild,
  DevToolsInjection,
  DevToolsServer,
}
