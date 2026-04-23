import type { RpcFunctionDefinitionAnyWithContext } from 'devframe/rpc'
import type { AgentTool, DevtoolDefinition, DevToolsHost, DevToolsNodeContext } from 'devframe/types'
import type { GenericSchema } from 'valibot'
import process from 'node:process'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { createHostContext } from '../context'
import { logger } from '../diagnostics'
import { valibotArgsToJsonSchema, valibotReturnToJsonSchema } from './to-json-schema'

export interface CreateMcpServerOptions {
  /**
   * Transport to use. Only `'stdio'` is implemented today; HTTP support
   * is planned in a follow-up PR.
   */
  transport?: 'stdio'
  /**
   * Expose shared-state keys as MCP resources.
   * - `true` (default) — every key the host publishes
   * - `false` — none
   * - `(key) => boolean` — filter
   */
  exposeSharedState?: boolean | ((key: string) => boolean)
  /** Override the name reported in the MCP handshake. */
  serverName?: string
  /** Override the version reported in the MCP handshake. Defaults to `definition.version ?? '0.0.0'`. */
  serverVersion?: string
  /** Called once the transport is connected. */
  onReady?: (info: { transport: 'stdio' }) => void
}

export interface McpServerHandle {
  stop: () => Promise<void>
}

/**
 * Wire an MCP {@link Server} to a devframe context. Returns the server
 * plus a disposal function for the subscriptions it sets up. The
 * transport is the caller's responsibility — `createMcpServer` connects
 * stdio; tests can connect an {@link InMemoryTransport} instead.
 *
 * @internal
 */
export function buildMcpServerFromContext(
  ctx: DevToolsNodeContext,
  options: { serverName: string, serverVersion: string, exposeSharedState: boolean | ((k: string) => boolean) },
): { server: Server, dispose: () => void } {
  const server = new Server(
    {
      name: options.serverName,
      version: options.serverVersion,
    },
    {
      capabilities: {
        tools: { listChanged: true },
        resources: { listChanged: true },
      },
    },
  )

  registerToolHandlers(server, ctx)
  registerResourceHandlers(server, ctx, options.exposeSharedState)

  const notify = (method: string): void => {
    server.notification({ method }).catch(() => { /* ignore transport errors */ })
  }
  const offManifest = ctx.agent.events.on('agent:manifest:changed', () => {
    notify('notifications/tools/list_changed')
    notify('notifications/resources/list_changed')
  })
  const offKeyAdded = ctx.rpc.sharedState.onKeyAdded(() => {
    notify('notifications/resources/list_changed')
  })

  return {
    server,
    dispose: () => {
      offManifest()
      offKeyAdded()
    },
  }
}

/**
 * Build an MCP server over the agent surface of a devtool definition.
 * Currently supports `stdio` transport only.
 *
 * @experimental The agent-native surface is experimental and may change
 * without a major version bump until it stabilizes.
 */
export async function createMcpServer(
  definition: DevtoolDefinition,
  options: CreateMcpServerOptions = {},
): Promise<McpServerHandle> {
  const transport = options.transport ?? 'stdio'
  if (transport !== 'stdio')
    throw logger.DF0017({ transport, reason: 'Only stdio transport is supported in this release.' }).throw()

  const host: DevToolsHost = {
    mountStatic: () => { /* MCP has no static surface */ },
    resolveOrigin: () => 'mcp://devframe',
  }

  const ctx = await createHostContext({
    cwd: process.cwd(),
    mode: 'dev',
    host,
  })
  await definition.setup(ctx)

  const { server, dispose } = buildMcpServerFromContext(ctx, {
    serverName: options.serverName ?? `${definition.id} (devframe)`,
    serverVersion: options.serverVersion ?? definition.version ?? '0.0.0',
    exposeSharedState: options.exposeSharedState ?? true,
  })

  const { startStdioTransport } = await import('./transports')
  let stop: () => Promise<void>
  try {
    stop = await startStdioTransport(server)
  }
  catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw logger.DF0017({ transport, reason }, { cause: error }).throw()
  }

  options.onReady?.({ transport: 'stdio' })

  return {
    async stop() {
      dispose()
      await stop()
    },
  }
}

function registerToolHandlers(server: Server, ctx: DevToolsNodeContext): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = ctx.agent.list().tools.map(tool => projectTool(tool, ctx))
    return { tools }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    try {
      const result = await ctx.agent.invoke(name, args ?? {})
      return {
        content: [
          {
            type: 'text',
            text: stringify(result),
          },
        ],
      }
    }
    catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error invoking "${name}": ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      }
    }
  })
}

function registerResourceHandlers(
  server: Server,
  ctx: DevToolsNodeContext,
  exposeSharedState: boolean | ((key: string) => boolean),
): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = ctx.agent.list().resources.map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    }))

    if (exposeSharedState !== false) {
      const filter = typeof exposeSharedState === 'function' ? exposeSharedState : () => true
      for (const key of ctx.rpc.sharedState.keys()) {
        if (!filter(key))
          continue
        resources.push({
          uri: `devframe://state/${encodeURIComponent(key)}`,
          name: key,
          description: `Shared state: ${key}`,
          mimeType: 'application/json',
        })
      }
    }

    return { resources }
  })

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params
    const parsed = parseResourceUri(uri)

    if (parsed.kind === 'resource') {
      const content = await ctx.agent.read(parsed.id)
      return {
        contents: [
          {
            uri,
            mimeType: content.mimeType ?? 'application/json',
            text: content.text ?? stringify(content.json),
          },
        ],
      }
    }

    if (parsed.kind === 'state') {
      const state = await ctx.rpc.sharedState.get(parsed.key as any)
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: stringify(state.value()),
          },
        ],
      }
    }

    throw new Error(`[devframe/mcp] unknown resource URI "${uri}"`)
  })
}

function projectTool(tool: AgentTool, ctx: DevToolsNodeContext): Record<string, unknown> {
  const inputSchema = tool.inputSchema ?? computeInputSchema(tool, ctx)
  const outputSchema = tool.outputSchema ?? computeOutputSchema(tool, ctx)
  return {
    name: tool.id,
    title: tool.title,
    description: tool.description,
    inputSchema,
    ...(outputSchema ? { outputSchema } : {}),
    annotations: {
      title: tool.title,
      readOnlyHint: tool.safety === 'read',
      destructiveHint: tool.safety === 'destructive',
    },
  }
}

function computeInputSchema(tool: AgentTool, ctx: DevToolsNodeContext): unknown {
  if (tool.kind !== 'rpc' || !tool.rpcName)
    return { type: 'object', properties: {} }
  const def = ctx.rpc.definitions.get(tool.rpcName) as RpcFunctionDefinitionAnyWithContext<DevToolsNodeContext> | undefined
  if (!def)
    return { type: 'object', properties: {} }
  const args = def.args as readonly GenericSchema[] | undefined
  return valibotArgsToJsonSchema(args).schema
}

function computeOutputSchema(tool: AgentTool, ctx: DevToolsNodeContext): unknown {
  if (tool.kind !== 'rpc' || !tool.rpcName)
    return undefined
  const def = ctx.rpc.definitions.get(tool.rpcName) as RpcFunctionDefinitionAnyWithContext<DevToolsNodeContext> | undefined
  if (!def)
    return undefined
  return valibotReturnToJsonSchema(def.returns as GenericSchema | undefined)
}

function parseResourceUri(uri: string): { kind: 'resource', id: string } | { kind: 'state', key: string } | { kind: 'unknown' } {
  const match = uri.match(/^devframe:\/\/(resource|state)\/(.+)$/)
  if (!match)
    return { kind: 'unknown' }
  const [, kind, rest] = match
  const decoded = decodeURIComponent(rest!)
  if (kind === 'resource')
    return { kind: 'resource', id: decoded }
  return { kind: 'state', key: decoded }
}

function stringify(value: unknown): string {
  if (value === undefined)
    return 'undefined'
  if (typeof value === 'string')
    return value
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return String(value)
  }
}
