import type { DevToolsIntegrationConfig } from './node/plugins/integration'
import {
  DevToolsIntegration as _DevToolsIntegration,
  runDevTools as _runDevTools,
} from './node/plugins/integration'

export interface DevToolsIntegrationOptions {
  command: 'serve' | 'build'
  root: string
  devtools: DevToolsIntegrationConfig
}

export function DevToolsIntegration(options: DevToolsIntegrationOptions): Promise<{ name: string }[]> {
  return _DevToolsIntegration(options as Parameters<typeof _DevToolsIntegration>[0])
}

export function runDevTools(
  builder: unknown,
  devtools: DevToolsIntegrationConfig,
): Promise<void> {
  return _runDevTools(builder, devtools)
}

export type { DevToolsIntegrationConfig }
