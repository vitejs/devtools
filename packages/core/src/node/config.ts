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

function normalizeHostname(host: string | boolean | undefined): string {
  return host === undefined || host === false || host === true
    ? 'localhost'
    : host
}

/**
 * @deprecated Use `resolveDevToolsConfig()` instead.
 */
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

export function resolveDevToolsConfig(
  config: DevToolsConfig | boolean | undefined,
  host: string | boolean | undefined,
  resolvedConfig?: ResolvedDevToolsConfig,
): ResolvedDevToolsConfig {
  if (config === undefined && resolvedConfig) {
    return resolvedConfig
  }

  const normalizedHost = normalizeHostname(host)

  if (!isObject(config)) {
    return {
      enabled: config === true,
      config: {
        clientAuth: true,
        clientAuthTokens: [],
        host: normalizedHost,
      },
    }
  }

  const {
    enabled,
    clientAuth = true,
    clientAuthTokens = [],
    host: resolvedHost = normalizedHost,
    ...normalizedConfig
  } = config

  return {
    enabled,
    config: {
      ...normalizedConfig,
      clientAuth,
      clientAuthTokens,
      host: resolvedHost,
    },
  }
}
