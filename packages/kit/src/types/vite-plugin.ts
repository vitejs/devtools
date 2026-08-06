import type { DevframeCapabilities } from '@devframes/hub/types'
import type { SharedState } from 'devframe/utils/shared-state'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { KitNodeContext } from '../node/context'

/**
 * Resolved dock defaults for the whole host, synced to every client over
 * shared state (`devtools:dock-config`). Layers, lowest priority first:
 * `DEFAULT_CATEGORIES_ORDER` < every plugin's declared `categoryOrder`
 * (shallow-merged) < {@link DevToolsHostDockConfig} < the user's own
 * drag-and-drop order.
 */
export interface DevToolsDockConfig {
  /** Top-level category weights, lower first. */
  categoryOrder?: Record<string, number>
  /** Items shown inline on the float bar before the overflow button. Defaults to 5; clamped to `>= 1`. */
  maxVisibleItems?: number
  /** Display mode on first run, before the developer has a stored preference. */
  defaultMode?: 'float' | 'edge'
  /** Viewport edge to attach to on first run. Only meaningful with `defaultMode: 'edge'`. */
  defaultPosition?: 'top' | 'right' | 'bottom' | 'left'
}

/**
 * Host-wide dock defaults, set once on `DevTools({ dock })` rather than by a
 * plugin — `maxVisibleItems`/`defaultMode`/`defaultPosition` are properties of
 * the one shared dock bar, so a single owner picks them instead of leaving Vite's
 * plugin array order to arbitrate between disagreeing plugins.
 */
export type DevToolsHostDockConfig = DevToolsDockConfig

/**
 * A plugin's own contribution to the dock config, declared alongside its
 * `setup()`. Only `categoryOrder` is here — it is the one setting that is
 * meaningful per plugin, since it just weighs the categories that plugin's own
 * entries fall into and shallow-merges across every plugin's declaration.
 */
export interface DevToolsPluginDockConfig {
  /** This plugin's category weights, lower first — shallow-merged with every other plugin's. */
  categoryOrder?: Record<string, number>
}

export interface DevToolsPluginOptions {
  capabilities?: {
    dev?: DevframeCapabilities | boolean
    build?: DevframeCapabilities | boolean
  }
  /** This plugin's dock defaults — see {@link DevToolsPluginDockConfig}. */
  dock?: DevToolsPluginDockConfig
  setup: (context: ViteDevToolsNodeContext) => void | Promise<void>
}

/**
 * Vite-extended node context — kit-augmented context with the four hub
 * subsystems (`docks`, `terminals`, `messages`, `commands`) plus the
 * Vite-specific slots (`viteConfig`, `viteServer`). Plugins running
 * under `@vitejs/devtools` rely on this surface; portable devframe
 * apps should target {@link KitNodeContext} or the framework-neutral
 * `DevframeNodeContext` from `devframe/types`.
 */
export interface ViteDevToolsNodeContext extends KitNodeContext {
  readonly viteConfig: ResolvedConfig
  readonly viteServer?: ViteDevServer
  /**
   * Dock config merged from every plugin's `devtools.dock` and the host's own
   * `DevTools({ dock })`, synced to every client over shared state. Mutate to
   * reconfigure already-connected clients live.
   */
  dockConfig: SharedState<DevToolsDockConfig>
}
