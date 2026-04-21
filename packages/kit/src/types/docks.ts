import type { EventEmitter } from './events'

export interface DevToolsDockHost {
  readonly views: Map<string, DevToolsDockUserEntry>
  readonly events: EventEmitter<{
    'dock:entry:updated': (entry: DevToolsDockUserEntry) => void
  }>

  register: <T extends DevToolsDockUserEntry>(entry: T, force?: boolean) => {
    update: (patch: Partial<T>) => void
  }
  update: (entry: DevToolsDockUserEntry) => void
  values: (options?: { includeBuiltin?: boolean }) => DevToolsDockEntry[]
}

// TODO: refine categories more clearly
export type DevToolsDockEntryCategory = 'app' | 'framework' | 'web' | 'advanced' | 'default' | '~viteplus' | '~builtin'

export type DevToolsDockEntryIcon = string | { light: string, dark: string }

export interface DevToolsDockEntryBase {
  id: string
  title: string
  icon: DevToolsDockEntryIcon
  /**
   * The default order of the entry in the dock.
   * The higher the number the earlier it appears.
   * @default 0
   */
  defaultOrder?: number
  /**
   * The category of the entry
   * @default 'default'
   */
  category?: DevToolsDockEntryCategory
  /**
   * Conditional visibility expression.
   * When set, the dock entry is only visible when the expression evaluates to true.
   * Uses the same syntax as command `when` clauses.
   *
   * Set to `'false'` to unconditionally hide the entry.
   *
   * @example 'clientType == embedded'
   * @see {@link import('../utils/when').evaluateWhen}
   */
  when?: string
  /**
   * Badge text to display on the dock icon (e.g., unread count)
   */
  badge?: string
}

export interface ClientScriptEntry {
  /**
   * The filepath or module name to import from
   */
  importFrom: string
  /**
   * The name to import the module as
   *
   * @default 'default'
   */
  importName?: string
}

export interface DevToolsViewIframe extends DevToolsDockEntryBase {
  type: 'iframe'
  url: string
  /**
   * The id of the iframe, if multiple tabs is assigned with the same id, the iframe will be shared.
   *
   * When not provided, it would be treated as a unique frame.
   */
  frameId?: string
  /**
   * Optional client script to import into the iframe
   */
  clientScript?: ClientScriptEntry
  /**
   * Enable remote-UI mode: the core injects a connection descriptor
   * (WS URL + pre-approved auth token) into the iframe URL so a hosted
   * page can connect back via `connectRemoteDevTools()` from
   * `@vitejs/devtools-kit/client` — without needing to ship a dist with
   * the plugin.
   *
   * Requires dev mode (no effect in build mode — no WS server exists).
   * When enabled, the dock is automatically hidden in build mode unless
   * the author provides an explicit `when` clause.
   *
   * @example
   *   remote: true
   *   remote: { transport: 'query', originLock: false }
   */
  remote?: boolean | RemoteDockOptions
}

export interface RemoteDockOptions {
  /**
   * How to pass the connection descriptor to the hosted page.
   *
   * - `'fragment'` (default): appended as `#vite-devtools-kit-connection=...`.
   *   Not sent in HTTP requests or Referer headers — safest for auth tokens.
   * - `'query'`: appended as `?vite-devtools-kit-connection=...`. Use when
   *   your hosting platform rewrites fragments or your SPA router repurposes
   *   the fragment for navigation. The token will appear in server access
   *   logs and outbound Referer headers.
   *
   * @default 'fragment'
   */
  transport?: 'fragment' | 'query'
  /**
   * Reject WS handshakes whose `Origin` header doesn't match the dock URL
   * origin. Turn off when the same hosted app is served from multiple
   * origins (e.g. preview deploys).
   *
   * @default true
   */
  originLock?: boolean
}

export type DevToolsViewLauncherStatus = 'idle' | 'loading' | 'success' | 'error'

export interface DevToolsViewLauncher extends DevToolsDockEntryBase {
  type: 'launcher'
  launcher: {
    icon?: DevToolsDockEntryIcon
    title: string
    status?: DevToolsViewLauncherStatus
    error?: string
    description?: string
    buttonStart?: string
    buttonLoading?: string
    onLaunch: () => Promise<void>
  }
}

export interface DevToolsViewAction extends DevToolsDockEntryBase {
  type: 'action'
  action: ClientScriptEntry
}

export interface DevToolsViewCustomRender extends DevToolsDockEntryBase {
  type: 'custom-render'
  renderer: ClientScriptEntry
}

export interface DevToolsViewBuiltin extends DevToolsDockEntryBase {
  type: '~builtin'
  id: '~terminals' | '~logs' | '~client-auth-notice' | '~settings' | '~popup'
}

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

export interface DevToolsViewJsonRender extends DevToolsDockEntryBase {
  type: 'json-render'
  /** JsonRenderer handle created by ctx.createJsonRenderer() */
  ui: JsonRenderer
}

export type DevToolsDockUserEntry = DevToolsViewIframe | DevToolsViewAction | DevToolsViewCustomRender | DevToolsViewLauncher | DevToolsViewJsonRender

export type DevToolsDockEntry = DevToolsDockUserEntry | DevToolsViewBuiltin

export type DevToolsDockEntriesGrouped = [category: string, entries: DevToolsDockEntry[]][]
