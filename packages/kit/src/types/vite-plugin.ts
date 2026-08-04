import type { DevframeCapabilities } from '@devframes/hub/types'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { KitNodeContext } from '../node/context'

/**
 * Host-wide dock defaults a plugin declares alongside its `setup()`. Collected
 * from every plugin during the Vite plugin scan (`createDevToolsContext`, last
 * wins per key) and handed to every client once via `ConnectionMeta`.
 */
export interface DevToolsDockConfig {
  /**
   * Top-level category weights, lower first. Layered over
   * `DEFAULT_CATEGORIES_ORDER`, beneath the user's own drag-and-drop order.
   */
  categoryOrder?: Record<string, number>
  /** Items shown inline on the float bar before the overflow button. Defaults to 5; clamped to `>= 1`. */
  maxVisibleItems?: number
  /** Display mode on first run, before the developer has a stored preference. */
  defaultMode?: 'float' | 'edge'
  /** Viewport edge to attach to on first run. Only meaningful with `defaultMode: 'edge'`. */
  defaultPosition?: 'top' | 'right' | 'bottom' | 'left'
}

export interface DevToolsPluginOptions {
  capabilities?: {
    dev?: DevframeCapabilities | boolean
    build?: DevframeCapabilities | boolean
  }
  /** Host-level dock defaults — see {@link DevToolsDockConfig}. */
  dock?: DevToolsDockConfig
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
  /** Dock config merged from every plugin's `devtools.dock`, assigned once after the plugin scan. */
  dockConfig?: DevToolsDockConfig
}
