import type { CAC } from 'cac'
import type { CliFlagsSchema } from '../adapters/flags'
import type { DevToolsNodeContext } from './context'

export type DevframeRuntime = 'cli' | 'build' | 'spa' | 'vite' | 'kit' | 'embedded'

/**
 * Classification of how a devframe is being deployed. Hosted adapters
 * (`vite`, `kit`, `embedded`) share their origin with a host app and
 * must namespace their mount path under `/__<id>/`. Standalone adapters
 * (`cli`, `spa`, `build`) own the origin and default to `/`.
 */
export type DevframeDeploymentKind = 'standalone' | 'hosted'

export interface DevframeCliOptions {
  /** Binary name; default: the devframe's `id`. */
  command?: string
  /** Preferred port for the dev server (default 9999). */
  port?: number
  /** Port scan range, forwarded to `get-port-please`. */
  portRange?: [number, number]
  /** Prefer a random open port. */
  random?: boolean
  /** Default host to bind to; `--host` overrides. */
  host?: string
  /**
   * Auto-open the browser when the dev server starts.
   * `true` opens the resolved origin; a string opens that relative path.
   * The `--open` / `--no-open` flags override this.
   */
  open?: boolean | string
  /**
   * Skip the RPC trust handshake. Set to `false` for trusted
   * single-user localhost tools. Default `true`.
   *
   * Forwarded to `startHttpAndWs` as a no-op placeholder until devframe
   * ships its own auth layer; `@vitejs/devtools` honors the equivalent
   * `devtools.clientAuth` today.
   */
  auth?: boolean
  /** Author's SPA dist directory (served as the devframe's UI). */
  distDir?: string
  /**
   * Capability-side CAC hook. Called with the CAC instance after the
   * adapter registers its built-in commands (`build` / `spa` / `mcp`)
   * but before `createCli`'s own `configureCli` caller. Use this to
   * contribute tool-specific flags and subcommands from the definition
   * itself.
   */
  configure?: (cli: CAC) => void
  /**
   * Typed CLI flags for the default `dev` command, backed by valibot
   * schemas. The adapter registers matching `--kebab-key` options on
   * CAC, validates the parsed values, and forwards the typed bag to
   * `setup(ctx, { flags })`.
   *
   * Use {@link defineCliFlags} to preserve the literal schema-map
   * shape, and {@link InferCliFlags} to recover the typed output at the
   * call site:
   *
   * ```ts
   * const appFlags = defineCliFlags({
   *   depth: v.pipe(v.number(), v.integer()),
   *   config: v.optional(v.string()),
   * })
   *
   * defineDevframe({
   *   cli: { flags: appFlags },
   *   setup(ctx, info) {
   *     const flags = info.flags as InferCliFlags<typeof appFlags>
   *   },
   * })
   * ```
   */
  flags?: CliFlagsSchema
}

export interface DevframeSpaOptions {
  base?: string
  /**
   * How the deployed SPA loads its data.
   * - `'query'` — read from URL search params.
   * - `'upload'` — accept a file drag-drop.
   * - `'none'`  — use the baked RPC dump only.
   */
  loader?: 'query' | 'upload' | 'none'
}

export interface DevframeBrowserContext {
  /**
   * The connected RPC client (may be write-disabled in static/spa modes).
   */
  rpc: unknown
}

/**
 * Runtime information threaded into `setup(ctx, info)`. Adapters
 * populate the fields that make sense for their deployment. In
 * particular, `createCli` fills `flags` with the parsed CAC bag.
 */
export interface DevframeSetupInfo {
  /** Parsed CLI flags, populated by the CLI adapter. */
  flags?: Record<string, unknown>
}

export interface DevframeDefinition {
  id: string
  name: string
  icon?: string | { light: string, dark: string }
  version?: string
  /**
   * Mount path override. Defaults depend on the adapter:
   * `/` for standalone (`cli` / `spa` / `build`), `/__<id>/` for hosted
   * (`vite` / `kit` / `embedded`).
   */
  basePath?: string
  capabilities?: {
    dev?: boolean | Record<string, boolean>
    build?: boolean | Record<string, boolean>
    spa?: boolean | Record<string, boolean>
  }
  /** Server-side setup — the primary entrypoint. Runs in every runtime. */
  setup: (ctx: DevToolsNodeContext, info?: DevframeSetupInfo) => void | Promise<void>
  /** Browser-only setup for the SPA adapter (bundled into the client). */
  setupBrowser?: (ctx: DevframeBrowserContext) => void | Promise<void>
  cli?: DevframeCliOptions
  spa?: DevframeSpaOptions
}

export function defineDevframe(d: DevframeDefinition): DevframeDefinition {
  return d
}

// --- Deprecated aliases (backward compatibility) ---

/** @deprecated Use `DevframeRuntime`. */
export type DevtoolRuntime = DevframeRuntime
/** @deprecated Use `DevframeDeploymentKind`. */
export type DevtoolDeploymentKind = DevframeDeploymentKind
/** @deprecated Use `DevframeCliOptions`. */
export type DevtoolCliOptions = DevframeCliOptions
/** @deprecated Use `DevframeSpaOptions`. */
export type DevtoolSpaOptions = DevframeSpaOptions
/** @deprecated Use `DevframeBrowserContext`. */
export type DevtoolBrowserContext = DevframeBrowserContext
/** @deprecated Use `DevframeSetupInfo`. */
export type DevtoolSetupInfo = DevframeSetupInfo
/** @deprecated Use `DevframeDefinition`. */
export type DevtoolDefinition = DevframeDefinition

let warnedDefineDevtool = false
/** @deprecated Use `defineDevframe`. */
export function defineDevtool(d: DevframeDefinition): DevframeDefinition {
  if (!warnedDefineDevtool) {
    warnedDefineDevtool = true
    console.warn('[devframe] `defineDevtool` is deprecated; use `defineDevframe` instead.')
  }
  return d
}
