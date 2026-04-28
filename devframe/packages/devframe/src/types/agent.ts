import type { RpcFunctionAgentOptions } from '../rpc/types'
import type { EventEmitter } from './events'

/**
 * Serializable description of an agent-exposed tool. This is the shape
 * returned by the agent host manifest and surfaced over the wire by
 * the `devframe:agent:list-tools` introspection RPC.
 *
 * @experimental The agent-native surface is experimental and may change
 * without a major version bump until it stabilizes.
 */
export interface AgentTool {
  /** Stable identifier. For RPC-backed tools, matches the RPC name. */
  id: string
  /** `'rpc'` when backed by a registered RPC function, `'tool'` when registered via `ctx.agent.registerTool()`. */
  kind: 'rpc' | 'tool'
  /** Display title (falls back to `id`). */
  title: string
  /** Human-readable description shown to the agent. */
  description: string
  /** Safety classification — drives MCP hint annotations downstream. */
  safety: 'read' | 'action' | 'destructive'
  /** Free-form tags for grouping/filtering. */
  tags?: readonly string[]
  /** Present for `kind === 'rpc'` — points to the RPC function name. */
  rpcName?: string
  /** JSON Schema describing the input (positional args synthesized to an object). */
  inputSchema?: unknown
  /** JSON Schema describing the output. */
  outputSchema?: unknown
  /** Example invocations shown to agents. */
  examples?: readonly { args: unknown[], description?: string }[]
}

/**
 * Input accepted by `DevToolsAgentHost.registerTool()`. Handler is
 * stripped from the serializable `AgentTool` projection.
 *
 * @experimental
 */
export interface AgentToolInput {
  id: string
  title?: string
  description: string
  safety?: 'read' | 'action' | 'destructive'
  tags?: readonly string[]
  inputSchema?: unknown
  outputSchema?: unknown
  examples?: readonly { args: unknown[], description?: string }[]
  /** Invoked when the tool is called. Receives args as provided by the caller. */
  handler: (args: any) => unknown | Promise<unknown>
}

/**
 * Serializable description of an agent-readable resource. Resources
 * surface structured or textual snapshots of devtools state.
 *
 * @experimental
 */
export interface AgentResource {
  id: string
  /** URI used by MCP clients. Defaults to `devframe://resource/<id>`. */
  uri: string
  name: string
  description?: string
  /** Defaults to `application/json`. */
  mimeType?: string
}

/**
 * Input accepted by `DevToolsAgentHost.registerResource()`.
 *
 * @experimental
 */
export interface AgentResourceInput {
  id: string
  name: string
  description?: string
  mimeType?: string
  /** Optional URI override — if omitted, a `devframe://resource/<id>` URI is generated. */
  uri?: string
  /** Snapshot reader. Called on each read. */
  read: () => Promise<AgentResourceContent> | AgentResourceContent
}

/**
 * Payload returned by `AgentResourceInput.read`. Either `text` or `json` must be set.
 *
 * @experimental
 */
export interface AgentResourceContent {
  text?: string
  json?: unknown
  /** Override the resource's declared mimeType for this read. */
  mimeType?: string
}

/**
 * Unified view of the agent-exposed surface.
 *
 * @experimental
 */
export interface AgentManifest {
  tools: readonly AgentTool[]
  resources: readonly AgentResource[]
}

/**
 * Handle returned by `registerTool` / `registerResource`.
 *
 * @experimental
 */
export interface AgentHandle {
  unregister: () => void
}

/**
 * Events emitted by `DevToolsAgentHost`.
 *
 * @experimental
 */
export interface DevToolsAgentHostEvents {
  'agent:tool:registered': (tool: AgentTool) => void
  'agent:tool:unregistered': (id: string) => void
  'agent:resource:registered': (resource: AgentResource) => void
  'agent:resource:unregistered': (id: string) => void
  /**
   * Fires when the unified manifest changes — including when a new
   * RPC function with an `agent` field is registered on `ctx.rpc`.
   */
  'agent:manifest:changed': () => void
}

/**
 * Host that aggregates the agent-exposed surface of a devtool: both
 * RPC functions flagged with `agent` and plugin-registered tools /
 * resources. Consumed by protocol adapters such as the devframe MCP
 * adapter.
 *
 * @experimental The agent-native surface is experimental and may change
 * without a major version bump until it stabilizes.
 */
export interface DevToolsAgentHost {
  readonly events: EventEmitter<DevToolsAgentHostEvents>

  /**
   * Register a tool not backed by an RPC function. Use this when you
   * want a plain agent action (e.g. a synthesized summary) that
   * shouldn't exist as a full RPC.
   */
  registerTool: (tool: AgentToolInput) => AgentHandle
  /** Unregister a previously registered tool by id. */
  unregisterTool: (id: string) => boolean

  /** Register a readable resource. */
  registerResource: (resource: AgentResourceInput) => AgentHandle
  /** Unregister a previously registered resource by id. */
  unregisterResource: (id: string) => boolean

  /**
   * Unified snapshot of agent-exposed surface: RPC functions with an
   * `agent` field (auto-discovered from `ctx.rpc.definitions`) plus
   * tools/resources registered on the host.
   */
  list: () => AgentManifest

  /**
   * Invoke any tool by id. Routes to the underlying RPC handler for
   * `kind === 'rpc'`, or to the registered handler for `kind === 'tool'`.
   */
  invoke: (id: string, args: unknown) => Promise<unknown>

  /** Read a resource by id. */
  read: (id: string) => Promise<AgentResourceContent>

  /** Look up a tool by id (returns the serializable projection). */
  getTool: (id: string) => AgentTool | undefined
  /** Look up a resource by id. */
  getResource: (id: string) => AgentResource | undefined
}

// Re-export the options interface for convenience.
export type { RpcFunctionAgentOptions }
