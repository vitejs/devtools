import type { RpcFunctionDefinitionAnyWithContext, RpcFunctionType } from 'devframe/rpc'
import type {
  AgentHandle,
  AgentManifest,
  AgentResource,
  AgentResourceContent,
  AgentResourceInput,
  AgentTool,
  AgentToolInput,
  DevToolsAgentHostEvents,
  DevToolsAgentHost as DevToolsAgentHostType,
  DevToolsNodeContext,
  EventEmitter,
  RpcFunctionAgentOptions,
} from 'devframe/types'
import { createEventEmitter } from 'devframe/utils/events'
import { logger } from './diagnostics'

interface RegisteredTool {
  readonly tool: AgentTool
  readonly handler?: (args: any) => unknown | Promise<unknown>
}

interface RegisteredResource {
  readonly resource: AgentResource
  readonly read: () => Promise<AgentResourceContent> | AgentResourceContent
}

/**
 * Framework-neutral host aggregating the agent-exposed surface of a
 * devtool. Auto-discovers RPC functions with an `agent` field from
 * `ctx.rpc.definitions`, and accepts plugin-registered tools /
 * resources via `registerTool` / `registerResource`.
 *
 * @experimental
 */
export class DevToolsAgentHost implements DevToolsAgentHostType {
  public readonly events: EventEmitter<DevToolsAgentHostEvents> = createEventEmitter()

  private readonly tools = new Map<string, RegisteredTool>()
  private readonly resources = new Map<string, RegisteredResource>()
  private _rpcUnsubscribe: (() => void) | undefined

  constructor(
    public readonly context: DevToolsNodeContext,
  ) {
    // Watch the RPC host for new `agent`-flagged definitions.
    this._rpcUnsubscribe = context.rpc.onChanged(() => {
      this.events.emit('agent:manifest:changed')
    })
  }

  registerTool(input: AgentToolInput): AgentHandle {
    this._validateToolId(input.id)

    const tool = this._projectTool(input)
    this.tools.set(tool.id, { tool, handler: input.handler })
    this.events.emit('agent:tool:registered', tool)
    this.events.emit('agent:manifest:changed')

    return {
      unregister: () => this.unregisterTool(tool.id),
    }
  }

  unregisterTool(id: string): boolean {
    const existed = this.tools.delete(id)
    if (existed) {
      this.events.emit('agent:tool:unregistered', id)
      this.events.emit('agent:manifest:changed')
    }
    return existed
  }

  registerResource(input: AgentResourceInput): AgentHandle {
    if (this.resources.has(input.id))
      throw logger.DF0016({ id: input.id }).throw()

    const resource: AgentResource = {
      id: input.id,
      name: input.name,
      description: input.description,
      mimeType: input.mimeType ?? 'application/json',
      uri: input.uri ?? `devframe://resource/${encodeURIComponent(input.id)}`,
    }
    this.resources.set(resource.id, { resource, read: input.read })
    this.events.emit('agent:resource:registered', resource)
    this.events.emit('agent:manifest:changed')

    return {
      unregister: () => this.unregisterResource(resource.id),
    }
  }

  unregisterResource(id: string): boolean {
    const existed = this.resources.delete(id)
    if (existed) {
      this.events.emit('agent:resource:unregistered', id)
      this.events.emit('agent:manifest:changed')
    }
    return existed
  }

  list(): AgentManifest {
    const rpcTools = this._collectRpcTools()
    const plainTools = Array.from(this.tools.values()).map(t => t.tool)
    const resources = Array.from(this.resources.values()).map(r => r.resource)
    return {
      tools: [...rpcTools, ...plainTools],
      resources,
    }
  }

  getTool(id: string): AgentTool | undefined {
    const plain = this.tools.get(id)
    if (plain)
      return plain.tool
    return this._collectRpcTools().find(t => t.id === id)
  }

  getResource(id: string): AgentResource | undefined {
    return this.resources.get(id)?.resource
  }

  async invoke(id: string, args: unknown): Promise<unknown> {
    const plain = this.tools.get(id)
    if (plain?.handler) {
      return await plain.handler(args)
    }

    const rpcDef = this._findRpcDefinition(id)
    if (rpcDef) {
      // RPC args are positional. Accept an object keyed by `arg0..argN`
      // (what the MCP adapter sends after flattening), or a plain array.
      const positional = this._coercePositionalArgs(args, rpcDef)
      return await this.context.rpc.invokeLocal(id as any, ...(positional as any))
    }

    throw new Error(`[devframe/agent] tool "${id}" not found`)
  }

  async read(id: string): Promise<AgentResourceContent> {
    const entry = this.resources.get(id)
    if (!entry)
      throw new Error(`[devframe/agent] resource "${id}" not found`)
    return await entry.read()
  }

  /** @internal */
  _dispose(): void {
    this._rpcUnsubscribe?.()
    this._rpcUnsubscribe = undefined
  }

  private _validateToolId(id: string): void {
    if (this.tools.has(id))
      throw logger.DF0015({ id }).throw()
    // Collision with an RPC function that already carries an `agent` field.
    const rpcDef = this.context.rpc.definitions.get(id)
    if (rpcDef?.agent)
      throw logger.DF0015({ id }).throw()
  }

  private _projectTool(input: AgentToolInput): AgentTool {
    if (!input.description || typeof input.description !== 'string')
      throw logger.DF0014({ name: input.id }).throw()

    return {
      id: input.id,
      kind: 'tool',
      title: input.title ?? input.id,
      description: input.description,
      safety: input.safety ?? 'action',
      tags: input.tags,
      inputSchema: input.inputSchema,
      outputSchema: input.outputSchema,
      examples: input.examples,
    }
  }

  private _collectRpcTools(): AgentTool[] {
    const out: AgentTool[] = []
    for (const [name, def] of this.context.rpc.definitions) {
      const agent = def.agent as RpcFunctionAgentOptions | undefined
      if (!agent)
        continue
      if (!agent.description || typeof agent.description !== 'string')
        throw logger.DF0014({ name }).throw()

      const type: RpcFunctionType = def.type ?? 'query'
      const safety = agent.safety ?? inferSafety(type)
      out.push({
        id: name,
        kind: 'rpc',
        title: agent.title ?? name,
        description: agent.description,
        safety,
        tags: agent.tags,
        rpcName: name,
        examples: agent.examples,
        // Schemas are carried by the definition itself — consumers
        // (e.g. the MCP adapter) convert valibot → JSON Schema on demand.
      })
    }
    return out
  }

  private _findRpcDefinition(id: string): RpcFunctionDefinitionAnyWithContext<DevToolsNodeContext> | undefined {
    const def = this.context.rpc.definitions.get(id)
    if (def?.agent)
      return def
    return undefined
  }

  private _coercePositionalArgs(
    args: unknown,
    def: RpcFunctionDefinitionAnyWithContext<DevToolsNodeContext>,
  ): unknown[] {
    if (Array.isArray(args))
      return args
    if (args === undefined || args === null)
      return []
    if (args && typeof args === 'object') {
      const obj = args as Record<string, unknown>
      const schemas = def.args as readonly unknown[] | undefined
      if (schemas && schemas.length)
        return schemas.map((_, i) => obj[`arg${i}`])
      // Fallback: detect arg0/arg1/... keys even without schemas.
      if (hasPositionalKeys(obj)) {
        const out: unknown[] = []
        let i = 0
        while (`arg${i}` in obj) {
          out.push(obj[`arg${i}`])
          i++
        }
        return out
      }
    }
    return [args]
  }
}

function inferSafety(type: RpcFunctionType): 'read' | 'action' | 'destructive' {
  if (type === 'static' || type === 'query')
    return 'read'
  return 'action'
}

function hasPositionalKeys(obj: Record<string, unknown>): boolean {
  return 'arg0' in obj
}
