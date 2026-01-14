import type { RpcDefinitionsFilter, RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { rolldownGetAssetDetails } from './functions/rolldown-get-asset-details'
import { rolldownGetAssetsList } from './functions/rolldown-get-assets-list'
import { rolldownGetChunkInfo } from './functions/rolldown-get-chunk-info'
import { rolldownGetChunksGraph } from './functions/rolldown-get-chunks-graph'
import { rolldownGetModuleInfo } from './functions/rolldown-get-module-info'
import { rolldownGetModuleRawEvents } from './functions/rolldown-get-module-raw-events'
import { rolldownGetModuleTransforms } from './functions/rolldown-get-module-transforms'
import { rolldownGetPackageDetails } from './functions/rolldown-get-package-details'
import { rolldownGetPackages } from './functions/rolldown-get-packages'
import { rolldownGetPluginDetails } from './functions/rolldown-get-plugin-details'
import { rolldownGetRawEvents } from './functions/rolldown-get-raw-events'
import { rolldownGetSessionCompareSummary } from './functions/rolldown-get-session-compare-summary'
import { rolldownGetSessionSummary } from './functions/rolldown-get-session-summary'
import { rolldownListSessions } from './functions/rolldown-list-sessions'
import '@vitejs/devtools-kit'

export const rpcFunctions = [
  rolldownListSessions,
  rolldownGetRawEvents,
  rolldownGetSessionSummary,
  rolldownGetModuleInfo,
  rolldownGetModuleRawEvents,
  rolldownGetModuleTransforms,
  rolldownGetChunksGraph,
  rolldownGetAssetsList,
  rolldownGetAssetDetails,
  rolldownGetPluginDetails,
  rolldownGetSessionCompareSummary,
  rolldownGetChunkInfo,
  rolldownGetPackages,
  rolldownGetPackageDetails,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

export const serverRpcSchemas = new Map(
  rpcFunctions.map(d => [
    d.name,
    { args: d.argsSchema, returns: d.returnSchema },
  ]),
)

export type ServerFunctionsStatic = RpcDefinitionsToFunctions<
  RpcDefinitionsFilter<typeof rpcFunctions, 'static'>
>

export type ServerFunctionsDump = {
  [K in keyof ServerFunctionsStatic]: Awaited<ReturnType<ServerFunctionsStatic[K]>>
}

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}
}
