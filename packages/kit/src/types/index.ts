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
  DevframeDiagnosticsHost as DevToolsDiagnosticsHost,
  DevframeDiagnosticsLogger as DevToolsDiagnosticsLogger,
  DevframeHost as DevToolsHost,
  DevframeNodeRpcSession as DevToolsNodeRpcSession,
  DevframeRpcClientFunctions as DevToolsRpcClientFunctions,
  DevframeRpcServerFunctions as DevToolsRpcServerFunctions,
  DevframeRpcSharedStates as DevToolsRpcSharedStates,
  DevframeViewHost as DevToolsViewHost,
  EventEmitter,
  EventsMap,
  EventUnsubscribe,
  RpcBroadcastOptions,
  RpcDefinitionsFilter,
  RpcDefinitionsToFunctions,
  RpcFunctionsHost,
  RpcSharedStateGetOptions,
  RpcSharedStateHost,
  RpcStreamingChannel,
  RpcStreamingChannelOptions,
  RpcStreamingHost,
} from '@devframes/hub/types'

// `EntriesToObject` and `Thenable` moved from `@devframes/hub/types` to
// `devframe/rpc` upstream (devframe 0.9.0-beta.5+) — they're RPC-shape
// helpers, not hub-augmented context types.
export type { EntriesToObject, Thenable } from 'devframe/rpc'

// `DevframeNodeContext` is the base framework-neutral context — hub does
// not re-export it because hub itself ships `DevframeHubContext` as the
// canonical hub-augmented surface. The kit aliases it for back-compat
// with code that referenced `DevToolsNodeContext` directly.
//
// `DevframeDiagnosticsDefinition` (the return type of `defineDiagnostics`)
// was replaced upstream by `DevframeDefineDiagnosticsOptions` (the options
// bag passed into it) as part of devframe 0.9's dead-code cleanup.
// `PartialWithoutId` was reduced to an internal `@devframes/hub/node` type
// and is no longer part of the public API surface.
export type {
  DevframeDefineDiagnosticsOptions as DevToolsDefineDiagnosticsOptions,
  DevframeNodeContext as DevToolsNodeContext,
} from 'devframe/types'
