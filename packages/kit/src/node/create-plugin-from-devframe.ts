import type { DevframeCapabilities, DevframeViewIframe } from '@devframes/hub/types'
import type { DevframeDefinition } from 'devframe/types'
import type { PluginWithDevTools } from '../types/vite-augment'
import type { KitNodeContext } from './context'
import { mountDevframe } from '@devframes/hub/node'

export interface CreatePluginFromDevframeOptions {
  /**
   * Vite plugin name override. Defaults to `devframe:${d.id}`.
   */
  name?: string
  /**
   * Mount path override. Defaults to `d.basePath` or `/__${d.id}/`.
   */
  base?: string
  /**
   * Overrides for the auto-synthesized iframe dock entry. Use this to
   * customize the entry's `category`, override the icon, hide it via
   * `when`, etc. Cannot change `id`, `type`, or `url` — those are
   * derived from the devframe definition.
   */
  dock?: Partial<Omit<DevframeViewIframe, 'id' | 'type' | 'url'>>
  /**
   * Capability flags forwarded onto the kit plugin's `devtools` slot.
   * Defaults to `d.capabilities`.
   */
  capabilities?: DevframeCapabilities | { dev?: DevframeCapabilities | boolean, build?: DevframeCapabilities | boolean }
  /**
   * Additional kit-only setup hook. Runs after the devframe-level
   * `d.setup(ctx)` and after the auto-derived dock entry has been
   * registered. Use this for kit-specific behavior that should not
   * bleed into the portable {@link DevframeDefinition} — e.g.
   * registering terminals/commands/messages, or enriching the
   * synthesized dock entry.
   */
  setup?: (ctx: KitNodeContext) => void | Promise<void>
}

/**
 * Wrap a {@link DevframeDefinition} as a Vite plugin that mounts inside
 * `@vitejs/devtools` (Vite DevTools). Delegates the mount work
 * (serving the SPA, registering the iframe dock entry, calling
 * `d.setup(ctx)`) to `@devframes/hub`'s `mountDevframe`, then runs the
 * optional kit-only `options.setup` hook.
 */
export function createPluginFromDevframe(
  d: DevframeDefinition,
  options: CreatePluginFromDevframeOptions = {},
): PluginWithDevTools {
  return {
    name: options.name ?? `devframe:${d.id}`,
    devtools: {
      capabilities: options.capabilities ?? (d.capabilities as any),
      async setup(rawCtx) {
        const ctx = rawCtx as KitNodeContext
        await mountDevframe(ctx, d, {
          base: options.base,
          dock: options.dock,
        })
        if (options.setup) {
          await options.setup(ctx)
        }
      },
    },
  }
}
