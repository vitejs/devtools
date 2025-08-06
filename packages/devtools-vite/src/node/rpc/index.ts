import type { RpcDefinitionsFilter, RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { getPayload } from './functions/get-payload'
import { openInEditor } from './functions/open-in-editor'
import { openInFinder } from './functions/open-in-finder'
import { rolldownGetAssetDetails } from './functions/rolldown-get-asset-details'
import { rolldownGetAssetsList } from './functions/rolldown-get-assets-list'
import { rolldownGetChunksGraph } from './functions/rolldown-get-chunks-graph'
import { rolldownGetModuleInfo } from './functions/rolldown-get-module-info'
import { rolldownGetModuleRawEvents } from './functions/rolldown-get-module-raw-events'
import { rolldownGetModuleTransforms } from './functions/rolldown-get-module-transforms'
import { rolldownGetPluginDetails } from './functions/rolldown-get-plugin-details'
import { rolldownGetRawEvents } from './functions/rolldown-get-raw-events'
import { rolldownGetSessionSummary } from './functions/rolldown-get-session-summary'
import { rolldownListSessions } from './functions/rolldown-list-sessions'

export const rpcFunctions = [
  openInEditor,
  openInFinder,
  getPayload,
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
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

export type ServerFunctionsStatic = RpcDefinitionsToFunctions<
  RpcDefinitionsFilter<typeof rpcFunctions, 'static'>
>

export type ServerFunctionsDump = {
  [K in keyof ServerFunctionsStatic]: Awaited<ReturnType<ServerFunctionsStatic[K]>>
}
