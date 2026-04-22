import type { DevToolsCapabilities, DevToolsNodeContext as DevToolsNodeContextBase } from 'takubox/types'
import type { ResolvedConfig, ViteDevServer } from 'vite'

export interface DevToolsPluginOptions {
  capabilities?: {
    dev?: DevToolsCapabilities | boolean
    build?: DevToolsCapabilities | boolean
  }
  setup: (context: ViteDevToolsNodeContext) => void | Promise<void>
}

/**
 * Vite-extended node context — framework-neutral {@link DevToolsNodeContextBase}
 * plus the Vite-specific slots consumers can rely on when running under
 * `@vitejs/devtools`. Callers that want portability should target the base
 * type from `takubox/types`.
 */
export interface ViteDevToolsNodeContext extends DevToolsNodeContextBase {
  readonly viteConfig: ResolvedConfig
  readonly viteServer?: ViteDevServer
}

/**
 * @deprecated — alias of {@link ViteDevToolsNodeContext}. Exists for one
 * release cycle while callers migrate.
 */
export type DevToolsNodeContext = ViteDevToolsNodeContext
