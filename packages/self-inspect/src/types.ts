import type { ClientScriptEntry } from '@vitejs/devtools-kit'

export interface ClientScriptInfo {
  dockId: string
  dockTitle: string
  dockType: string
  script: ClientScriptEntry
}

export interface DevtoolsPluginInfo {
  name: string
  hasDevtools: boolean
  hasSetup: boolean
  capabilities?: {
    dev?: unknown
    build?: unknown
  }
}
