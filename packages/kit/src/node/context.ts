import type { CreateHostContextOptions } from 'devframe/node'
import type { DevToolsNodeContext } from 'devframe/types'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { DevToolsCommandsHost } from '../types/commands'
import type { DevToolsDockHost } from '../types/docks'
import type { JsonRenderer, JsonRenderSpec } from '../types/json-render'
import type { DevToolsMessagesHost } from '../types/messages'
import type { DevToolsTerminalHost } from '../types/terminals'
import { createHostContext } from 'devframe/node'
import { debounce } from 'perfect-debounce'
import { DevToolsCommandsHost as CommandsHostImpl } from './host-commands'
import { DevToolsDockHost as DocksHostImpl } from './host-docks'
import { DevToolsMessagesHost as MessagesHostImpl } from './host-messages'
import { DevToolsTerminalHost as TerminalsHostImpl } from './host-terminals'

/**
 * Kit-augmented node context — extends devframe's framework-neutral
 * `DevToolsNodeContext` with the hub-level subsystems (`docks`,
 * `terminals`, `messages`, `commands`) and the `createJsonRenderer`
 * factory, all owned by `@vitejs/devtools-kit`. When kit hosts the
 * devtool inside Vite DevTools, also exposes the underlying Vite
 * handles.
 */
export interface KitNodeContext extends DevToolsNodeContext {
  docks: DevToolsDockHost
  terminals: DevToolsTerminalHost
  messages: DevToolsMessagesHost
  commands: DevToolsCommandsHost
  /**
   * Create a JsonRenderer handle for building json-render powered UIs.
   */
  createJsonRenderer: (spec: JsonRenderSpec) => JsonRenderer
  readonly viteConfig?: ResolvedConfig
  readonly viteServer?: ViteDevServer
}

export interface CreateKitContextOptions extends CreateHostContextOptions {
  /** Optional Vite resolved config to surface on the context (for Vite-mounted hubs). */
  viteConfig?: ResolvedConfig
  /** Optional Vite dev server to surface on the context. */
  viteServer?: ViteDevServer
}

/**
 * Create a kit-level node context: wraps devframe's `createHostContext`,
 * attaches the hub hosts (`docks`, `terminals`, `messages`, `commands`),
 * and wires the shared-state synchronization that powers the unified
 * client UI.
 */
export async function createKitContext(options: CreateKitContextOptions): Promise<KitNodeContext> {
  const baseContext = await createHostContext(options)
  const context = baseContext as KitNodeContext

  const docks = new DocksHostImpl(context)
  const terminals = new TerminalsHostImpl(context)
  const messages = new MessagesHostImpl(context)
  const commands = new CommandsHostImpl(context)

  context.docks = docks
  context.terminals = terminals
  context.messages = messages
  context.commands = commands

  if (options.viteConfig)
    Object.defineProperty(context, 'viteConfig', { value: options.viteConfig, enumerable: true })
  if (options.viteServer)
    Object.defineProperty(context, 'viteServer', { value: options.viteServer, enumerable: true })

  await docks.init()

  let jrCounter = 0
  context.createJsonRenderer = (initialSpec: JsonRenderSpec): JsonRenderer => {
    const stateKey = `devframe:json-render:${jrCounter++}`
    const statePromise = context.rpc.sharedState.get(stateKey as any, {
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

  const debounceMs = options.mode === 'build' ? 0 : 10

  const docksSharedState = await context.rpc.sharedState.get('devframe:docks', { initialValue: [] })
  const refreshDocks = debounce(() => {
    docksSharedState.mutate(() => docks.values())
  }, debounceMs)
  docks.events.on('dock:entry:updated', refreshDocks)

  const broadcastTerminals = debounce(() => {
    context.rpc.broadcast({
      method: 'devframe:terminals:updated',
      args: [],
    })
    docksSharedState.mutate(() => docks.values())
  }, debounceMs)
  terminals.events.on('terminal:session:updated', broadcastTerminals)

  const broadcastMessages = debounce(() => {
    context.rpc.broadcast({
      method: 'devframe:messages:updated',
      args: [],
    })
    docksSharedState.mutate(() => docks.values())
  }, debounceMs)
  messages.events.on('message:added', broadcastMessages)
  messages.events.on('message:updated', broadcastMessages)
  messages.events.on('message:removed', broadcastMessages)
  messages.events.on('message:cleared', broadcastMessages)

  const commandsSharedState = await context.rpc.sharedState.get('devframe:commands', { initialValue: [] })
  const syncCommands = debounce(() => {
    commandsSharedState.mutate(() => commands.list())
  }, debounceMs)
  commands.events.on('command:registered', syncCommands)
  commands.events.on('command:unregistered', syncCommands)

  return context
}
