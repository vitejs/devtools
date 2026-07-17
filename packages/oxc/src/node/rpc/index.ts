import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { oxlintGetSession } from './functions/oxlint-get-session'
import { oxlintListSessions } from './functions/oxlint-list-sessions'
import { overview } from './functions/overview'
import { oxlintGetConfigFile } from './functions/oxlint-get-config-file'
import { oxfmtGetConfigFile } from './functions/oxfmt-get-config-file'
import { openInEditor } from './functions/open-in-editor'
import { getConfigFiles } from './functions/get-config-files'
import '@vitejs/devtools-kit'

export const rpcFunctions = [
  oxlintListSessions,
  oxlintGetSession,
  overview,
  oxlintGetConfigFile,
  oxfmtGetConfigFile,
  getConfigFiles,
  openInEditor,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}
}
