import type { DevToolsAgentHost } from './agent'
import type { DevToolsDiagnosticsHost } from './diagnostics'
import type { DevToolsHost } from './host'
import type { DevToolsViewHost } from './views'

export interface DevToolsCapabilities {
  rpc?: boolean
  views?: boolean
}

/**
 * Framework-neutral node context — RPC + diagnostics + agent + the
 * view-host (HTTP file-serving). Hub-level subsystems (docks,
 * terminals, messages, commands) are not part of this surface; they are
 * added by `@vitejs/devtools-kit`'s `createKitContext` when the devtool
 * is mounted into a multi-integration hub.
 */
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
  views: DevToolsViewHost
  /**
   * Structured diagnostics host — wraps `logs-sdk` and lets integrations
   * register their own coded errors/warnings into the shared logger.
   */
  diagnostics: DevToolsDiagnosticsHost
  /**
   * Agent host — aggregates the agent-exposed surface of this devtool.
   *
   * @experimental
   */
  agent: DevToolsAgentHost
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
