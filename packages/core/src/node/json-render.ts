import type {
  DevframeJsonRenderSpec,
  JsonRenderView,
  JsonRenderViewRef,
  UIElement,
} from '@devframes/json-render'
import type { CreateJsonRenderViewOptions } from '@devframes/json-render/node'
import type { KitNodeContext } from '@vitejs/devtools-kit'
import { createJsonRenderView } from '@devframes/json-render/node'
import { nanoid } from '@vitejs/devtools-kit/utils/nanoid'

// `json-render` is the opt-in `@devframes/json-render` integration, which
// contributes the `'json-render'` variant to the hub's open dock union. This
// type-only re-export also pulls in that module augmentation so
// `docks.register({ type: 'json-render' })` resolves for plugin authors.
export type { DevframeJsonRenderDockEntry as DevToolsViewJsonRender } from '@devframes/json-render/hub'

/** A json-render spec — the declarative UI description a plugin authors. */
export type JsonRenderSpec<Element extends UIElement = UIElement> = DevframeJsonRenderSpec<Element>

/** A single element within a spec's `elements` map. */
export type JsonRenderElement = UIElement

export type { JsonRenderView, JsonRenderViewRef }

/**
 * The handle returned by `ctx.createJsonRenderer()`. It wraps a devframe
 * {@link JsonRenderView} and exposes the kit's method names.
 *
 * Register a `json-render` dock entry with the handle as `ui`
 * (`docks.register({ type: 'json-render', ui, … })`); the client subscribes
 * through its `stateKey`. Drive the panel by calling `updateSpec` /
 * `updateState` on the handle.
 */
export interface JsonRenderer<SpecType extends JsonRenderSpec = JsonRenderSpec> {
  /** Replace the entire spec. */
  updateSpec: (spec: SpecType) => void
  /** Shallow-merge values into the view's `state`. */
  updateState: (state: Record<string, unknown>) => void
  /** Unregister the underlying view's shared state and listeners. */
  dispose: () => void
  /** Shared-state key the client subscribes to for the live spec + state. */
  readonly _stateKey: string
  /** The serializable reference to the underlying view. */
  readonly view: JsonRenderViewRef<SpecType>
}

type CreateJsonRenderer = <SpecType extends JsonRenderSpec>(
  spec: SpecType,
  options?: Pick<CreateJsonRenderViewOptions<SpecType>, 'schema'>,
) => JsonRenderer<SpecType>

declare module '@vitejs/devtools-kit' {
  interface KitNodeContext {
    /**
     * Create a json-render handle for building declarative, server-driven
     * panels. Provided by Vite DevTools (`@vitejs/devtools`), which owns the
     * `@devframes/json-render` dependency so the kit stays light.
     */
    createJsonRenderer: CreateJsonRenderer
  }
}

/** Identity helper that types a json-render spec literal with inference. */
export function defineJsonRenderSpec<SpecType extends JsonRenderSpec>(spec: SpecType): SpecType {
  return spec
}

export function attachJsonRenderer(context: KitNodeContext): void {
  const createJsonRenderer: CreateJsonRenderer = (spec, options = {}) => {
    const view = createJsonRenderView(context, { id: `kit-${nanoid()}`, spec, ...options })

    // Methods are non-enumerable so the handle stays serializable when carried
    // on a dock entry's `ui` field — the docks shared-state projection walks
    // only enumerable own keys, so the closures never reach the wire.
    const handle = {
      _stateKey: view.ref.stateKey,
      view: view.ref,
    } as JsonRenderer<typeof spec> // methods are attached right below
    Object.defineProperties(handle, {
      updateSpec: { value: (next: typeof spec) => view.update(next) },
      updateState: {
        value: (state: Record<string, unknown>) => {
          view.patchState(
            Object.entries(state).map(([key, value]) => ({ op: 'add' as const, path: `/${key}`, value })),
          )
        },
      },
      dispose: { value: () => view.dispose() },
    })
    return handle
  }

  Object.defineProperty(context, 'createJsonRenderer', { value: createJsonRenderer, enumerable: true })
}
