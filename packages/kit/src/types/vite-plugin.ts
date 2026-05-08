import type { DevToolsCapabilities } from 'devframe/types'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { KitNodeContext } from '../node/context'

export interface DevToolsPluginOptions {
  capabilities?: {
    dev?: DevToolsCapabilities | boolean
    build?: DevToolsCapabilities | boolean
  }
  setup: (context: ViteDevToolsNodeContext) => void | Promise<void>
}

/**
 * Vite-extended node context — kit-augmented context with the four hub
 * subsystems (`docks`, `terminals`, `messages`, `commands`) plus the
 * Vite-specific slots (`viteConfig`, `viteServer`). Plugins running
 * under `@vitejs/devtools` rely on this surface; portable devframe
 * apps should target {@link KitNodeContext} or the framework-neutral
 * `DevToolsNodeContext` from `devframe/types`.
 */
export interface ViteDevToolsNodeContext extends KitNodeContext {
  readonly viteConfig: ResolvedConfig
  readonly viteServer?: ViteDevServer
}

/**
 * @deprecated — alias of {@link ViteDevToolsNodeContext}. Exists for one
 * release cycle while callers migrate.
 */
export type DevToolsNodeContext = ViteDevToolsNodeContext
