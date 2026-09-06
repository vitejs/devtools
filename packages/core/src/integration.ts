import type { DevToolsConfig } from './node/config'
import {
  DevToolsIntegration as _DevToolsIntegration,
  runDevTools as _runDevTools,
} from './node/plugins/integration'

export interface DevToolsIntegrationConfig {
  host?: string | boolean
  options: boolean | DevToolsConfig | undefined
}

export interface DevToolsIntegrationOptions {
  command: 'serve' | 'build'
  root?: string
  devtools: DevToolsIntegrationConfig
}

export function DevToolsIntegration(options: DevToolsIntegrationOptions): Promise<{ name: string }[]> {
  return _DevToolsIntegration(options)
}

export function runDevTools(builder: unknown): Promise<void> {
  return _runDevTools(builder)
}
