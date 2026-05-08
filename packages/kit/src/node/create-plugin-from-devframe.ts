import type { DevtoolDefinition, DevToolsCapabilities } from 'devframe/types'
import type { DevToolsViewIframe } from '../types/docks'
import type { PluginWithDevTools } from '../types/vite-augment'
import type { KitNodeContext } from './context'
import { resolveBasePath } from 'devframe/internal'
import { resolve } from 'pathe'

export interface CreatePluginFromDevframeOptions {
  /**
   * Vite plugin name override. Defaults to `devframe:${d.id}`.
   */
  name?: string
  /**
   * Mount path override. Defaults to `d.basePath` or `/.${d.id}/`.
   */
  base?: string
  /**
   * Overrides for the auto-synthesized iframe dock entry. Use this to
   * customize the entry's `category`, override the icon, hide it via
   * `when`, etc. Cannot change `id`, `type`, or `url` — those are
   * derived from the devtool definition.
   */
  dock?: Partial<Omit<DevToolsViewIframe, 'id' | 'type' | 'url'>>
  /**
   * Capability flags forwarded onto the kit plugin's `devtools` slot.
   * Defaults to `d.capabilities`.
   */
  capabilities?: DevToolsCapabilities | { dev?: DevToolsCapabilities | boolean, build?: DevToolsCapabilities | boolean }
  /**
   * Additional kit-only setup hook. Runs after the devframe-level
   * `d.setup(ctx)` and after the auto-derived dock entry has been
   * registered. Use this for kit-specific behavior that should not
   * bleed into the portable {@link DevtoolDefinition} — e.g.
   * registering terminals/commands/messages, or enriching the
   * synthesized dock entry.
   */
  setup?: (ctx: KitNodeContext) => void | Promise<void>
}

/**
 * Wrap a {@link DevtoolDefinition} as a Vite plugin that mounts inside
 * `@vitejs/devtools` (Vite DevTools). The kit takes care of mounting
 * the SPA at the resolved base path, synthesizing an iframe dock entry
 * from the definition's metadata, and threading the kit-augmented
 * context into both the devframe-level `d.setup` and the optional
 * `options.setup` hook.
 *
 * For richer kit-specific behavior (registering terminals/commands,
 * adding additional dock entries), use `options.setup`.
 */
export function createPluginFromDevframe(
  d: DevtoolDefinition,
  options: CreatePluginFromDevframeOptions = {},
): PluginWithDevTools {
  const base = options.base ?? resolveBasePath(d, 'hosted')

  return {
    name: options.name ?? `devframe:${d.id}`,
    devtools: {
      capabilities: options.capabilities ?? (d.capabilities as any),
      async setup(rawCtx) {
        const ctx = rawCtx as KitNodeContext

        if (d.cli?.distDir) {
          ctx.views.hostStatic(base, resolve(d.cli.distDir))
        }

        ctx.docks.register({
          id: d.id,
          title: d.name,
          icon: d.icon ?? 'ph:plug-duotone',
          ...options.dock,
          type: 'iframe',
          url: base,
        } as DevToolsViewIframe)

        await d.setup(ctx)

        if (options.setup) {
          await options.setup(ctx)
        }
      },
    },
  }
}
