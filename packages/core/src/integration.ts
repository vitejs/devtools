import {
  DevToolsIntegration as _DevToolsIntegration,
  runDevTools as _runDevTools,
} from './node/plugins/integration'

export interface DevToolsIntegrationOptions {
  config: unknown
}

export function DevToolsIntegration(options: DevToolsIntegrationOptions): { name: string } {
  return _DevToolsIntegration(options as Parameters<typeof _DevToolsIntegration>[0])
}

export function runDevTools(builder: unknown): Promise<void> {
  return _runDevTools(builder)
}
