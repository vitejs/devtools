import type { RpcFunctionDefinitionAny } from 'devframe/rpc'
import type { DevToolsHost, DevToolsNodeContext, JsonRenderer, JsonRenderSpec } from 'devframe/types'
import { debounce } from 'perfect-debounce'
import { ContextUtils } from './context-utils'
import { DevToolsAgentHost } from './host-agent'
import { DevToolsCommandsHost } from './host-commands'
import { DevToolsDockHost } from './host-docks'
import { RpcFunctionsHost } from './host-functions'
import { DevToolsLogsHost } from './host-logs'
import { DevToolsTerminalHost } from './host-terminals'
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
 * Framework-neutral core of the DevTools node context. Wires the six
 * host subsystems, the JSON-render factory, and the standard shared-state
 * bookkeeping. Framework-specific extensions (Vite plugin scan, Vite
 * config/server fields, built-in RPCs like `open-in-editor`) layer on
 * top via wrapper functions such as kit's `createDevToolsContext`.
 */
export async function createHostContext(options: CreateHostContextOptions): Promise<DevToolsNodeContext> {
  const { cwd, workspaceRoot = cwd, mode, host, builtinRpcDeclarations = [] } = options

  const context: DevToolsNodeContext = {
    cwd,
    workspaceRoot,
    mode,
    host,
    rpc: undefined!,
    docks: undefined!,
    views: undefined!,
    terminals: undefined!,
    logs: undefined!,
    commands: undefined!,
    agent: undefined!,
    utils: ContextUtils,
    createJsonRenderer: undefined!,
  } as unknown as DevToolsNodeContext

  const rpcHost = new RpcFunctionsHost(context)
  const docksHost = new DevToolsDockHost(context)
  const viewsHost = new DevToolsViewHost(context)
  const terminalsHost = new DevToolsTerminalHost(context)
  const logsHost = new DevToolsLogsHost(context)
  const commandsHost = new DevToolsCommandsHost(context)
  context.rpc = rpcHost
  context.docks = docksHost
  context.views = viewsHost
  context.terminals = terminalsHost
  context.logs = logsHost
  context.commands = commandsHost
  // Agent host must be constructed after `rpcHost` so it can subscribe
  // to `onChanged` — it auto-discovers RPC functions flagged with
  // the `agent` field.
  const agentHost = new DevToolsAgentHost(context)
  context.agent = agentHost

  let jrCounter = 0
  context.createJsonRenderer = (initialSpec: JsonRenderSpec): JsonRenderer => {
    const stateKey = `devtoolskit:internal:json-render:${jrCounter++}`
    const statePromise = rpcHost.sharedState.get(stateKey as any, {
      initialValue: initialSpec as any,
    })

    return {
      _stateKey: stateKey,
      async updateSpec(spec) {
        const state = await statePromise
        state.mutate(() => spec as any)
      },
      async updateState(newState) {
        const state = await statePromise
        state.mutate((draft: any) => {
          draft.state = { ...draft.state, ...newState }
        })
      },
    }
  }

  // Auto-register devframe's own agent introspection RPCs. These power
  // the MCP adapter and any future agent CLI. They are not themselves
  // agent-exposed (no `agent` field).
  for (const fn of BUILTIN_AGENT_RPC) {
    rpcHost.register(fn)
  }

  for (const fn of builtinRpcDeclarations) {
    rpcHost.register(fn)
  }

  await docksHost.init()

  const docksSharedState = await rpcHost.sharedState.get('devtoolskit:internal:docks', { initialValue: [] })

  docksHost.events.on('dock:entry:updated', debounce(() => {
    docksSharedState.mutate(() => context.docks.values())
  }, mode === 'build' ? 0 : 10))

  terminalsHost.events.on('terminal:session:updated', debounce(() => {
    rpcHost.broadcast({
      method: 'devtoolskit:internal:terminals:updated',
      args: [],
    })
    docksSharedState.mutate(() => context.docks.values())
  }, mode === 'build' ? 0 : 10))

  terminalsHost.events.on('terminal:session:stream-chunk', (data) => {
    rpcHost.broadcast({
      method: 'devtoolskit:internal:terminals:stream-chunk',
      args: [data],
    })
  })

  const debouncedLogsUpdate = debounce(() => {
    rpcHost.broadcast({
      method: 'devtoolskit:internal:logs:updated',
      args: [],
    })
    docksSharedState.mutate(() => context.docks.values())
  }, mode === 'build' ? 0 : 10)

  logsHost.events.on('log:added', () => debouncedLogsUpdate())
  logsHost.events.on('log:updated', () => debouncedLogsUpdate())
  logsHost.events.on('log:removed', () => debouncedLogsUpdate())
  logsHost.events.on('log:cleared', () => debouncedLogsUpdate())

  const commandsSharedState = await rpcHost.sharedState.get('devtoolskit:internal:commands', { initialValue: [] })
  const debouncedCommandsSync = debounce(() => {
    commandsSharedState.mutate(() => commandsHost.list())
  }, mode === 'build' ? 0 : 10)
  commandsHost.events.on('command:registered', () => debouncedCommandsSync())
  commandsHost.events.on('command:unregistered', () => debouncedCommandsSync())

  return context
}
