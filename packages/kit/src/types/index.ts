// Re-export the kit-augmented context type so consumers can import it
// from the kit's main `types` barrel.
export type { CreateKitContextOptions, KitNodeContext } from '../node/context'

export * from './commands'
export * from './docks'
export * from './json-render'
export * from './messages'
export * from './settings'
export * from './terminals'
export * from './vite-augment'
export * from './vite-plugin'

export type {
  ConnectionMeta,
  DevframeCapabilities as DevToolsCapabilities,
  DevframeDiagnosticsDefinition as DevToolsDiagnosticsDefinition,
  DevframeDiagnosticsHost as DevToolsDiagnosticsHost,
  DevframeDiagnosticsLogger as DevToolsDiagnosticsLogger,
  DevframeHost as DevToolsHost,
  DevframeNodeRpcSession as DevToolsNodeRpcSession,
  DevframeRpcClientFunctions as DevToolsRpcClientFunctions,
  DevframeRpcServerFunctions as DevToolsRpcServerFunctions,
  DevframeRpcSharedStates as DevToolsRpcSharedStates,
  DevframeViewHost as DevToolsViewHost,
  EntriesToObject,
  EventEmitter,
  EventsMap,
  EventUnsubscribe,
  PartialWithoutId,
  RpcBroadcastOptions,
  RpcDefinitionsFilter,
  RpcDefinitionsToFunctions,
  RpcFunctionsHost,
  RpcSharedStateGetOptions,
  RpcSharedStateHost,
  RpcStreamingChannel,
  RpcStreamingChannelOptions,
  RpcStreamingHost,
  Thenable,
} from '@devframes/hub/types'

// `DevframeNodeContext` is the base framework-neutral context — hub does
// not re-export it because hub itself ships `DevframeHubContext` as the
// canonical hub-augmented surface. The kit aliases it for back-compat
// with code that referenced `DevToolsNodeContext` directly.
export type { DevframeNodeContext as DevToolsNodeContext } from 'devframe/types'
