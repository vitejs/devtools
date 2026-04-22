import type { DevToolsNodeContext } from './context'

export type DevtoolRuntime = 'cli' | 'build' | 'spa' | 'vite' | 'kit' | 'embedded'

export interface DevtoolCliOptions {
  command?: string
  port?: number
  open?: boolean
  /** Author's SPA dist directory (served as the devtool's UI). */
  distDir?: string
}

export interface DevtoolSpaOptions {
  base?: string
  /**
   * How the deployed SPA loads its data.
   * - `'query'` — read from URL search params.
   * - `'upload'` — accept a file drag-drop.
   * - `'none'`  — use the baked RPC dump only.
   */
  loader?: 'query' | 'upload' | 'none'
}

export interface DevtoolBrowserContext {
  /**
   * The connected RPC client (may be write-disabled in static/spa modes).
   */
  rpc: unknown
}

export interface DevtoolDefinition {
  id: string
  name: string
  icon?: string | { light: string, dark: string }
  version?: string
  capabilities?: {
    dev?: boolean | Record<string, boolean>
    build?: boolean | Record<string, boolean>
    spa?: boolean | Record<string, boolean>
  }
  /** Server-side setup — the primary entrypoint. Runs in every runtime. */
  setup: (ctx: DevToolsNodeContext) => void | Promise<void>
  /** Browser-only setup for the SPA adapter (bundled into the client). */
  setupBrowser?: (ctx: DevtoolBrowserContext) => void | Promise<void>
  cli?: DevtoolCliOptions
  spa?: DevtoolSpaOptions
}

export function defineDevtool(d: DevtoolDefinition): DevtoolDefinition {
  return d
}
