import { agentInvokeTool } from './agent-invoke-tool'
import { agentListResources } from './agent-list-resources'
import { agentListTools } from './agent-list-tools'
import { agentReadResource } from './agent-read-resource'

export { agentInvokeTool, agentListResources, agentListTools, agentReadResource }

/**
 * Built-in agent introspection RPC functions. Registered automatically
 * by `createHostContext`. Not themselves agent-exposed (no `agent`
 * field) — they power the MCP adapter and any future agent CLI.
 *
 * @experimental
 */
export const BUILTIN_AGENT_RPC = [
  agentListTools,
  agentInvokeTool,
  agentListResources,
  agentReadResource,
] as const

declare module 'devframe/types' {
  interface DevToolsRpcServerFunctions {
    'devframe:agent:list-tools': () => Promise<readonly import('devframe/types').AgentTool[]>
    'devframe:agent:invoke-tool': (id: string, args: unknown) => Promise<unknown>
    'devframe:agent:list-resources': () => Promise<readonly import('devframe/types').AgentResource[]>
    'devframe:agent:read-resource': (id: string) => Promise<import('devframe/types').AgentResourceContent>
  }
}
