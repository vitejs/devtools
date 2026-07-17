import type { RpcDefinitionsToFunctions } from '@vitejs/devtools-kit'
import { oxlintGetSession } from './functions/oxlint-get-session'
import { oxlintListSessions } from './functions/oxlint-list-sessions'
import { overview } from './functions/overview'
import { oxlintGetConfigFile } from './functions/oxlint-get-config-file'
import { oxfmtGetConfigFile } from './functions/oxfmt-get-config-file'
import { openInEditor } from './functions/open-in-editor'

export const rpcFunctions = [
  oxlintListSessions,
  oxlintGetSession,
  overview,
  oxlintGetConfigFile,
  oxfmtGetConfigFile,
  openInEditor,
] as const

export type ServerFunctions = RpcDefinitionsToFunctions<typeof rpcFunctions>

// devframe ≥0.7.4: augment the canonical `devframe/types` module directly
// (renamed re-exports like the kit's `DevTools*` alias no longer merge).
declare module 'devframe/types' {
  interface DevframeRpcServerFunctions extends ServerFunctions {}
}
