import type { RpcDefinitionsFilter, RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { rolldownDeleteSession } from './functions/rolldown-delete-session'
import { rolldownGetAssetDetails } from './functions/rolldown-get-asset-details'
import { rolldownGetAssetsList } from './functions/rolldown-get-assets-list'
import { rolldownGetBuildCommand } from './functions/rolldown-get-build-command'
import { rolldownGetChunkInfo } from './functions/rolldown-get-chunk-info'
import { rolldownGetChunksGraph } from './functions/rolldown-get-chunks-graph'
import { rolldownGetModuleInfo } from './functions/rolldown-get-module-info'
import { rolldownGetModuleTransforms } from './functions/rolldown-get-module-transforms'
import { rolldownGetPackageDetails } from './functions/rolldown-get-package-details'
import { rolldownGetPackages } from './functions/rolldown-get-packages'
import { rolldownGetPluginDetails } from './functions/rolldown-get-plugin-details'
import { rolldownGetProjectInfo } from './functions/rolldown-get-project-info'
import { rolldownGetSessionCompareDetails } from './functions/rolldown-get-session-compare-details'
import { rolldownGetSessionCompareSummary } from './functions/rolldown-get-session-compare-summary'
import { rolldownGetSessionSummary } from './functions/rolldown-get-session-summary'
import { rolldownListSessions } from './functions/rolldown-list-sessions'
import { rolldownRenameSession } from './functions/rolldown-rename-session'
import { rolldownRunBuild } from './functions/rolldown-run-build'
import { rolldownWaitForBuild } from './functions/rolldown-wait-for-build'
import '@vitejs/devtools-kit'

export const rpcFunctions = [
  rolldownListSessions,
  rolldownGetSessionSummary,
  rolldownGetModuleInfo,
  rolldownGetModuleTransforms,
  rolldownGetChunksGraph,
  rolldownGetAssetsList,
  rolldownGetAssetDetails,
  rolldownGetPluginDetails,
  rolldownGetSessionCompareSummary,
  rolldownGetSessionCompareDetails,
  rolldownGetChunkInfo,
  rolldownGetProjectInfo,
  rolldownGetPackages,
  rolldownGetPackageDetails,
  rolldownGetBuildCommand,
  rolldownRunBuild,
  rolldownWaitForBuild,
  rolldownDeleteSession,
  rolldownRenameSession,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

export type ServerFunctionsStatic = RpcDefinitionsToFunctions<
  RpcDefinitionsFilter<typeof rpcFunctions, 'static'>
>

export type ServerFunctionsDump = {
  [K in keyof ServerFunctionsStatic]: Awaited<ReturnType<ServerFunctionsStatic[K]>>
}

// devframe ≥0.7.4: augment the canonical `devframe/types` module directly
// (renamed re-exports like the kit's `DevTools*` alias no longer merge).
declare module 'devframe/types' {
  interface DevframeRpcServerFunctions extends ServerFunctions {}
}
