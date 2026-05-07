import type { DevToolsAgentHost } from './agent'
import type { DevToolsCommandsHost } from './commands'
import type { DevToolsDiagnosticsHost } from './diagnostics'
import type { ClientScriptEntry, DevToolsDockHost, JsonRenderer, JsonRenderSpec } from './docks'
import type { DevToolsHost } from './host'
import type { DevToolsMessagesHost } from './messages'
import type { DevToolsTerminalHost } from './terminals'
import type { DevToolsViewHost } from './views'

export interface DevToolsCapabilities {
  rpc?: boolean
  views?: boolean
}

export interface DevToolsNodeContext {
  readonly workspaceRoot: string
  readonly cwd: string
  /**
   * Lifecycle distinction surfaced to plugin authors:
   *
   *   - `'dev'`   — long-running, interactive session. Connections come and
   *                 go; broadcasts and shared-state mutations are debounced
   *                 to keep the UI responsive.
   *   - `'build'` — one-shot batch run. The context is set up, the devtool
   *                 collects what it needs, and a snapshot is written. No
   *                 live UI, no WS server.
   *
   * Names are inherited from Vite's serve/build dichotomy but the meaning
   * is general: the same distinction applies to any tool that runs in
   * either an interactive or a static-output mode.
   */
  readonly mode: 'dev' | 'build'
  /**
   * Host runtime abstraction — exposes `mountStatic` / `resolveOrigin` /
   * `getStorageDir`.
   */
  host: DevToolsHost
  rpc: import('./rpc').RpcFunctionsHost
  docks: DevToolsDockHost
  views: DevToolsViewHost
  utils: DevToolsNodeUtils
  terminals: DevToolsTerminalHost
  /**
   * User-facing message subsystem — toast notifications and the
   * "Messages & Notifications" dock panel. Plugins call
   * `ctx.messages.add({ ... })` to surface activity to users.
   */
  messages: DevToolsMessagesHost
  /**
   * @deprecated Use `ctx.messages` instead. Will be removed in a future release.
   */
  readonly logs: DevToolsMessagesHost
  /**
   * Structured diagnostics host — wraps `logs-sdk` and lets integrations
   * register their own coded errors/warnings into the shared logger.
   */
  diagnostics: DevToolsDiagnosticsHost
  commands: DevToolsCommandsHost
  /**
   * Agent host — aggregates the agent-exposed surface of this devtool.
   *
   * @experimental
   */
  agent: DevToolsAgentHost
  /**
   * Create a JsonRenderer handle for building json-render powered UIs.
   */
  createJsonRenderer: (spec: JsonRenderSpec) => JsonRenderer
}

export interface DevToolsNodeUtils {
  /**
   * Create a simple client script from a function or stringified code.
   *
   * @deprecated testing helper; prefer a proper importable module.
   * @experimental
   */
  createSimpleClientScript: (fn: string | ((ctx: any) => void)) => ClientScriptEntry
}

export interface ConnectionMeta {
  backend: 'websocket' | 'static'
  websocket?: number | string
  /**
   * Names of RPC functions that have declared `jsonSerializable: true`.
   * Used by the WS / static client to dispatch the per-call wire
   * serializer (strict JSON for these methods, structured-clone for
   * the rest). Populated by the server / build adapter; absent on
   * legacy clients, in which case all outgoing messages fall back to
   * structured-clone.
   */
  jsonSerializableMethods?: string[]
}

export interface RemoteConnectionInfo extends ConnectionMeta {
  backend: 'websocket'
  websocket: string
  v: 1
  authToken: string
  origin: string
}
