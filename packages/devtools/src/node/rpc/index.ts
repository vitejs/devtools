import type { DefinitionsToFunctions, FilterDefinitions } from './types'
import { getPayload } from './functions/get-payload'
import { openInEditor } from './functions/open-in-editor'
import { openInFinder } from './functions/open-in-finder'
import { rolldownGetModuleInfo } from './functions/rolldown-get-module-info'
import { rolldownGetModuleRawEvents } from './functions/rolldown-get-module-raw-events'
import { rolldownGetModuleTransforms } from './functions/rolldown-get-module-transforms'
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
] as const

export type ServerFunctions = DefinitionsToFunctions<typeof rpcFunctions>

export type ServerFunctionsStatic = DefinitionsToFunctions<
  FilterDefinitions<typeof rpcFunctions, 'static'>
>

export type ServerFunctionsDump = {
  [K in keyof ServerFunctionsStatic]: Awaited<ReturnType<ServerFunctionsStatic[K]>>
}
