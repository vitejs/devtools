import type { DevToolsHost } from '../types/host'

export interface CreateH3DevToolsHostOptions {
  /** The h3 app instance — registered once the CLI adapter lands. */
  app?: unknown
  /**
   * Host the standalone server listens on, e.g. `http://localhost:9999`.
   * Consumed by `resolveOrigin` for dock entries that need an absolute URL.
   */
  origin: string
  /**
   * Register a static-file handler at `base` serving files from `distDir`.
   * Wired into the h3 app once the CLI adapter lands (commit 5). For now
   * the CLI isn't running, so the default is a no-op.
   */
  mount?: (base: string, distDir: string) => void | Promise<void>
}

/**
 * h3-backed {@link DevToolsHost} — used by the standalone CLI adapter.
 * This commit adds the shell; the CLI adapter in commit 5 wires it up
 * with a real h3 app and sirv handler.
 */
export function createH3DevToolsHost(options: CreateH3DevToolsHostOptions): DevToolsHost {
  return {
    mountStatic(base, distDir) {
      return options.mount?.(base, distDir)
    },
    resolveOrigin() {
      return options.origin
    },
  }
}
