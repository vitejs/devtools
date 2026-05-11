import type { RpcFunctionDefinitionAny } from 'devframe/rpc'
import type { DevToolsHost, DevToolsNodeContext } from 'devframe/types'
import { diagnostics as rpcDiagnostics } from '../rpc/diagnostics'
import { diagnostics as devframeDiagnostics } from './diagnostics'
import { DevToolsAgentHost } from './host-agent'
import { DevToolsDiagnosticsHost } from './host-diagnostics'
import { RpcFunctionsHost } from './host-functions'
import { DevToolsViewHost } from './host-views'
import { BUILTIN_AGENT_RPC } from './rpc'

export interface CreateHostContextOptions {
  cwd: string
  workspaceRoot?: string
  mode: 'dev' | 'build'
  host: DevToolsHost
  /**
   * Built-in RPC declarations to register on the host. Framework
   * adapters (vite, rolldown, cli) can pass the ones they need; the
   * host itself has no opinions about the built-in set.
   */
  builtinRpcDeclarations?: readonly RpcFunctionDefinitionAny[]
}

/**
 * Framework-neutral core of the DevTools node context. Wires the RPC
 * host, view (HTTP file-serving) host, diagnostics, and agent
 * subsystems. Hub-level subsystems (`docks`, `terminals`, `messages`,
 * `commands`, `createJsonRenderer`) are owned by
 * `@vitejs/devtools-kit` — its `createKitContext` wraps this and
 * attaches them when the devframe is mounted into a multi-integration
 * hub.
 */
export async function createHostContext(options: CreateHostContextOptions): Promise<DevToolsNodeContext> {
  const { cwd, workspaceRoot = cwd, mode, host, builtinRpcDeclarations = [] } = options

  const context: DevToolsNodeContext = {
    cwd,
    workspaceRoot,
    mode,
    host,
    rpc: undefined!,
    views: undefined!,
    diagnostics: undefined!,
    agent: undefined!,
  } as unknown as DevToolsNodeContext

  const rpcHost = new RpcFunctionsHost(context)
  const viewsHost = new DevToolsViewHost(context)
  const diagnosticsHost = new DevToolsDiagnosticsHost(context, [devframeDiagnostics, rpcDiagnostics])
  context.rpc = rpcHost
  context.views = viewsHost
  context.diagnostics = diagnosticsHost

  // Agent host must be constructed after `rpcHost` so it can subscribe
  // to `onChanged` — it auto-discovers RPC functions flagged with
  // the `agent` field.
  const agentHost = new DevToolsAgentHost(context)
  context.agent = agentHost

  // Auto-register devframe's own agent introspection RPCs. These power
  // the MCP adapter and any future agent CLI. They are not themselves
  // agent-exposed (no `agent` field).
  for (const fn of BUILTIN_AGENT_RPC) {
    rpcHost.register(fn)
  }

  for (const fn of builtinRpcDeclarations) {
    rpcHost.register(fn)
  }

  return context
}
