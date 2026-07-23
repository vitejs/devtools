import type { CreateHubContextOptions, DevframeHubContext } from '@devframes/hub/node'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { JsonRenderer, JsonRenderSpec } from '../types/json-render'
import { createHubContext } from '@devframes/hub/node'
import { createJsonRenderView } from '@devframes/json-render/node'
import { nanoid } from '../utils/nanoid'

/**
 * Kit-augmented node context — the framework-neutral hub context from
 * `@devframes/hub`, plus the Vite-specific slots surfaced when kit hosts
 * the devtool inside Vite DevTools, and the kit's `createJsonRenderer`
 * factory (json-render is the opt-in `@devframes/json-render` package, so
 * the kit — not the hub — surfaces it on the context).
 *
 * `Omit<DevframeHubContext, 'createJsonRenderer'>`: hub 0.7.9 re-added its own
 * `createJsonRenderer` as a **deprecated** back-compat factory (removed in
 * 0.8) typed against the hub's own pre-0.7 `JsonRenderSpec` (whose element
 * `props` is optional). The kit's factory is typed against
 * `@devframes/json-render`'s `Spec` (`props` required) instead — the
 * currently-recommended, non-deprecated surface — so the property must be
 * omitted from the base before it's redeclared here, or the narrower
 * parameter type makes this an invalid override.
 */
export interface KitNodeContext extends Omit<DevframeHubContext, 'createJsonRenderer'> {
  readonly viteConfig?: ResolvedConfig
  readonly viteServer?: ViteDevServer
  /**
   * Create a json-render handle for building declarative, server-driven
   * panels. Register the returned handle on a `json-render` dock entry's `ui`
   * field and call `updateSpec` / `updateState` to drive it reactively.
   */
  createJsonRenderer: (spec: JsonRenderSpec) => JsonRenderer
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
 * and attaches the Vite-specific slots plus the `createJsonRenderer`
 * factory. The hub layer owns the docks/terminals/messages/commands
 * subsystems and seeds the shared-state sync the unified client UI consumes.
 */
export async function createKitContext(options: CreateKitContextOptions): Promise<KitNodeContext> {
  const context = await createHubContext(options) as KitNodeContext

  if (options.viteConfig)
    Object.defineProperty(context, 'viteConfig', { value: options.viteConfig, enumerable: true })
  if (options.viteServer)
    Object.defineProperty(context, 'viteServer', { value: options.viteServer, enumerable: true })

  Object.defineProperty(context, 'createJsonRenderer', {
    value: (spec: JsonRenderSpec) => createJsonRenderer(context, spec),
    enumerable: true,
  })

  return context
}

/**
 * Build a kit {@link JsonRenderer} handle over a devframe json-render view.
 * The handle's methods are defined non-enumerably so the whole object stays
 * serializable when carried on a dock entry's `ui` field — the docks
 * shared-state projection walks only enumerable own keys, so the live
 * closures never reach the wire while `_stateKey` / `upstreamVersion` do.
 */
function createJsonRenderer(context: KitNodeContext, spec: JsonRenderSpec): JsonRenderer {
  const view = createJsonRenderView(context, { id: `kit-${nanoid()}`, spec })

  const handle = {
    _stateKey: view.ref.stateKey,
    upstreamVersion: view.ref.upstreamVersion,
    view: view.ref,
  } as JsonRenderer

  Object.defineProperties(handle, {
    updateSpec: {
      value: (next: JsonRenderSpec) => view.update(next),
      enumerable: false,
    },
    updateState: {
      value: (state: Record<string, unknown>) => {
        view.patchState(
          Object.entries(state).map(([key, value]) => ({ op: 'add' as const, path: `/${key}`, value })),
        )
      },
      enumerable: false,
    },
    dispose: {
      value: () => view.dispose(),
      enumerable: false,
    },
  })

  return handle
}
