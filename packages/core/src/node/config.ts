import type { StartOptions } from './cli-commands'
import { isObject } from 'devframe/node'

export interface DevToolsConfig extends Partial<StartOptions> {
  enabled: boolean
  /**
   * Vite environments to enable DevTools for. Defaults to all environments.
   */
  environments?: string[]
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
  /**
   * Origins allowed to open the DevTools WebSocket connection, in addition to the built-in
   * loopback allowlist (`localhost`, `127.0.0.1`, etc).
   *
   * The loopback check is a plain string match against the `Origin` header, not a DNS/hosts-file
   * resolution — a custom dev hostname that resolves to loopback via `/etc/hosts` or a local DNS
   * override (e.g. `dev-my-app.example.com`) is invisible to it and gets rejected. List such
   * hostnames here explicitly.
   */
  allowedOrigins?: string[]
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
