// Re-export the kit-augmented context type so consumers can import it
// from the kit's main `types` barrel.
export type { CreateKitContextOptions, KitNodeContext } from '../node/context'

export type { WhenContext, WhenExpression } from '../utils/when'
export * from './commands'
export * from './docks'
export * from './messages'
export * from './settings'
export * from './terminals'
export * from './vite-augment'
export * from './vite-plugin'

export type { RpcDefinitionsFilter, RpcDefinitionsToFunctions } from 'devframe/rpc'

// NOTE: we re-export devframe's types individually rather than using
// `export * from 'devframe/types'` because the rolldown-plugin-dts step
// fails with a `MemberExpression` AST error on namespace re-exports
// from external packages (tsdown 0.21 / rolldown-plugin-dts 0.23).
// Revisit once upstream supports it.
export type {
  ConnectionMeta,
  DevToolsCapabilities,
  DevToolsDiagnosticsDefinition,
  DevToolsDiagnosticsHost,
  DevToolsDiagnosticsLogger,
  DevToolsHost,
  DevToolsNodeRpcSession,
  DevToolsRpcClientFunctions,
  DevToolsRpcServerFunctions,
  DevToolsRpcSharedStates,
  DevToolsViewHost,
  EntriesToObject,
  EventEmitter,
  EventsMap,
  EventUnsubscribe,
  JsonRenderElement,
  JsonRenderer,
  JsonRenderSpec,
  PartialWithoutId,
  RpcBroadcastOptions,
  RpcFunctionsHost,
  RpcSharedStateGetOptions,
  RpcSharedStateHost,
  RpcStreamingChannel,
  RpcStreamingChannelOptions,
  RpcStreamingHost,
  Thenable,
} from 'devframe/types'
