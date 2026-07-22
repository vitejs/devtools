import type {
  DevframeJsonRenderSpec,
  JsonRenderView,
  JsonRenderViewRef,
  UIElement,
} from '@devframes/json-render'

// A Devframes json-render spec is an `@json-render/core` `Spec` (flat `root`
// + `elements` map, plus optional initial `state`). These aliases keep the
// kit's historical `JsonRender*` names pointing at the extracted
// `@devframes/json-render` package.

/** A json-render spec — the declarative UI description a plugin authors. */
export type JsonRenderSpec = DevframeJsonRenderSpec

/** A single element within a spec's `elements` map. */
export type JsonRenderElement = UIElement

export type { JsonRenderView, JsonRenderViewRef }

/**
 * The handle returned by `ctx.createJsonRenderer()`. It wraps a devframe
 * {@link JsonRenderView} (created via `@devframes/json-render`'s
 * `createJsonRenderView`) and exposes the kit's back-compat method names.
 *
 * Its methods are defined non-enumerably so the handle stays fully
 * serializable when carried on a `json-render` dock entry's `ui` field —
 * only the plain string metadata (`_stateKey`, `upstreamVersion`) crosses
 * the wire to the client, which subscribes through `_stateKey`.
 */
export interface JsonRenderer {
  /** Replace the entire spec. */
  updateSpec: (spec: JsonRenderSpec) => void
  /** Shallow-merge values into the view's `state`. */
  updateState: (state: Record<string, unknown>) => void
  /** Unregister the underlying view's shared state and listeners. */
  dispose: () => void
  /** Shared-state key the client subscribes to for the live spec + state. */
  readonly _stateKey: string
  /** Upstream `@json-render/*` version the view was authored against. */
  readonly upstreamVersion: string
  /** The serializable reference to the underlying view. */
  readonly view: JsonRenderViewRef
}
