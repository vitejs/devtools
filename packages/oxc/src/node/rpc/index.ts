import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { oxlintCapabilities } from './functions/oxlint-capabilities'
import { oxlintDeleteResult } from './functions/oxlint-delete-result'
import { oxlintGetResult } from './functions/oxlint-get-result'
import { oxlintListResults } from './functions/oxlint-list-results'
import { oxlintRun } from './functions/oxlint-run'
import { overview } from './functions/overview'
import { oxlintGetConfigFile } from './functions/oxlint-get-config-file'
import { oxfmtGetConfigFile } from './functions/oxfmt-get-config-file'
import { openInEditor } from './functions/open-in-editor'
import { getConfigFiles } from './functions/get-config-files'
import '@vitejs/devtools-kit'

export const rpcFunctions = [
  oxlintCapabilities,
  oxlintListResults,
  oxlintGetResult,
  oxlintDeleteResult,
  overview,
  oxlintGetConfigFile,
  oxfmtGetConfigFile,
  getConfigFiles,
  openInEditor,
] as const

export const viteRpcFunctions = [oxlintRun] as const

export type ServerFunctions = RpcDefinitionsToFunctions<
  readonly [...typeof rpcFunctions, ...typeof viteRpcFunctions]
>

declare module '@vitejs/devtools-kit' {
  export interface DevToolsRpcServerFunctions extends ServerFunctions {}
}
