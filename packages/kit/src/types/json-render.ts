export interface JsonRenderElement {
  type: string
  props?: Record<string, unknown>
  children?: string[]
  /** json-render event bindings (e.g. `{ press: { action: "my:action" } }`) */
  on?: Record<string, unknown>
  /** json-render visibility condition */
  visible?: unknown
  /** json-render repeat binding */
  repeat?: unknown
  /** Allow additional json-render element fields */
  [key: string]: unknown
}

export interface JsonRenderSpec {
  root: string
  elements: Record<string, JsonRenderElement>
  /** Initial client-side state model for $state/$bindState expressions */
  state?: Record<string, unknown>
}

export interface JsonRenderer {
  /** Replace the entire spec */
  updateSpec: (spec: JsonRenderSpec) => void | Promise<void>
  /** Update json-render state values (shallow merge into spec.state) */
  updateState: (state: Record<string, unknown>) => void | Promise<void>
  /** Internal: shared state key used by the client to subscribe */
  readonly _stateKey: string
}
