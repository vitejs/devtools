import type { CreateInteractiveAuthOptions } from 'devframe/recipes/interactive-auth'
import type { StartOptions } from './cli-commands'

export type DevToolsApply = 'serve' | 'build' | 'all'

export interface DevToolsConfig extends Partial<StartOptions> {
  /**
   * Enable Vite DevTools.
   *
   * @default true
   */
  enabled?: boolean
  /**
   * Limit Vite DevTools to a specific Vite command.
   * By default, Vite DevTools applies to both serve and build.
   */
  apply?: DevToolsApply
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
   * Print the one-time code and magic-link URL somewhere other than stdout.
   *
   * The default banner is a boxed `console.log` from inside the dev server.
   * Supply this to surface the code in the host's own chrome instead.
   */
  banner?: CreateInteractiveAuthOptions['banner']
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
  config: Omit<DevToolsConfig, 'enabled' | 'apply'> & { host: string }
  enabled: boolean
  apply: DevToolsApply
}

export function normalizeDevToolsConfig(
  config: DevToolsConfig | boolean | undefined,
  host: string,
): ResolvedDevToolsConfig {
  const resolved = typeof config === 'object' && config !== null ? config : undefined
  const enabled = config === true || (resolved != null && (resolved.enabled ?? true))
  const { enabled: _enabled, apply = 'all', ...options } = resolved ?? {}
  return {
    enabled,
    apply,
    config: {
      ...options,
      clientAuth: resolved?.clientAuth ?? true,
      clientAuthTokens: resolved?.clientAuthTokens ?? [],
      host: resolved?.host ?? host,
    },
  }
}

export function isDevToolsEnabled(
  config: ResolvedDevToolsConfig,
  command: 'serve' | 'build',
): boolean {
  return config.enabled && (config.apply === 'all' || config.apply === command)
}
