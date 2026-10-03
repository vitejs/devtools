import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ResolvedDevToolsConfig } from './config'

const resolvedDevToolsConfigs = new WeakMap<
  ViteDevToolsNodeContext,
  ResolvedDevToolsConfig
>()

export const defaultResolvedDevToolsConfig: ResolvedDevToolsConfig = {
  apply: 'all',
  config: {
    clientAuth: true,
    clientAuthTokens: [],
    host: 'localhost',
  },
  enabled: true,
}

export function setResolvedDevToolsConfig(
  context: ViteDevToolsNodeContext,
  config: ResolvedDevToolsConfig,
): void {
  resolvedDevToolsConfigs.set(context, config)
}

export function getResolvedDevToolsConfig(
  context: ViteDevToolsNodeContext,
): ResolvedDevToolsConfig {
  return resolvedDevToolsConfigs.get(context) ?? defaultResolvedDevToolsConfig
}
