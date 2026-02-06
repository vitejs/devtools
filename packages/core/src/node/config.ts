import type { StartOptions } from './cli-commands'
import { isObject } from './utils'

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
      host: isObject(config) ? (config.host ?? host) : host,
    },
  }
}
