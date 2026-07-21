import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { oxlintDeleteResult } from './functions/oxlint-delete-result'
import { oxlintGetResult } from './functions/oxlint-get-result'
import { oxlintListResults } from './functions/oxlint-list-results'
import { oxlintRun } from './functions/oxlint-run'
import { overview } from './functions/overview'
import { oxlintGetConfigFile } from './functions/oxlint-get-config-file'
import { oxfmtGetConfigFile } from './functions/oxfmt-get-config-file'
import { openInEditor } from './functions/open-in-editor'
import { getConfigFiles } from './functions/get-config-files'

export const rpcFunctions = [
  oxlintRun,
  oxlintListResults,
  oxlintGetResult,
  oxlintDeleteResult,
  overview,
  oxlintGetConfigFile,
  oxfmtGetConfigFile,
  getConfigFiles,
  openInEditor,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

// devframe ≥0.7.4: augment the canonical `devframe/types` module directly
// (renamed re-exports like the kit's `DevTools*` alias no longer merge).
declare module 'devframe/types' {
  interface DevframeRpcServerFunctions extends ServerFunctions {}
}
