import type { StartOptions } from './cli-commands'
import { isObject } from 'devframe/node'

export interface DevToolsConfig extends Partial<StartOptions> {
  enabled: boolean
  /**
   * Disable client authentication.
   *
   * Beware that if you disable client authentication,
   * any browsers can connect to the devtools and access to your server and filesystem.
   * (including other devices, if you open server `host` option to LAN or WAN)
   *
   * @default true
   */
  clientAuth?: boolean
  /**
   * Pre-configured auth tokens that are automatically trusted.
   *
   * Clients connecting with an auth token matching one of these
   * will be auto-approved without a terminal prompt.
   */
  clientAuthTokens?: string[]
}

export interface ResolvedDevToolsConfig {
  config: Omit<DevToolsConfig, 'enabled'> & { host: string }
  enabled: boolean
}

export function normalizeDevToolsConfig(
  config: DevToolsConfig | boolean | undefined,
  host: string,
): ResolvedDevToolsConfig {
  return {
    enabled: config === true || !!(config && config.enabled),
    config: {
      ...(isObject(config) ? config : {}),
      clientAuth: isObject(config) ? (config.clientAuth ?? true) : true,
      clientAuthTokens: isObject(config) ? (config.clientAuthTokens ?? []) : [],
      host: isObject(config) ? (config.host ?? host) : host,
    },
  }
}
