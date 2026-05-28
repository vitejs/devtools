import type { CreateHubContextOptions, DevframeHubContext } from '@devframes/hub/node'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import { createHubContext } from '@devframes/hub/node'

/**
 * Kit-augmented node context — the framework-neutral hub context from
 * `@devframes/hub`, plus the Vite-specific slots surfaced when kit hosts
 * the devtool inside Vite DevTools.
 */
export interface KitNodeContext extends DevframeHubContext {
  readonly viteConfig?: ResolvedConfig
  readonly viteServer?: ViteDevServer
}

export interface CreateKitContextOptions extends CreateHubContextOptions {
  /** Optional Vite resolved config to surface on the context (for Vite-mounted hubs). */
  viteConfig?: ResolvedConfig
  /** Optional Vite dev server to surface on the context. */
  viteServer?: ViteDevServer
}

/**
 * Create a kit-level node context: wraps `@devframes/hub`'s
 * `createHubContext` (which itself wraps devframe's `createHostContext`)
 * and attaches the Vite-specific slots. The hub layer owns the
 * docks/terminals/messages/commands subsystems and seeds the shared-state
 * sync the unified client UI consumes.
 */
export async function createKitContext(options: CreateKitContextOptions): Promise<KitNodeContext> {
  const context = await createHubContext(options) as KitNodeContext

  if (options.viteConfig)
    Object.defineProperty(context, 'viteConfig', { value: options.viteConfig, enumerable: true })
  if (options.viteServer)
    Object.defineProperty(context, 'viteServer', { value: options.viteServer, enumerable: true })

  return context
}
