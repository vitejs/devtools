import type { DevToolsHost } from '../types/host'
import { homedir } from 'node:os'
import process from 'node:process'
import { join } from 'pathe'

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
  /**
   * Namespace for storage paths returned by `getStorageDir`. Workspace
   * state lives under `${workspaceRoot}/node_modules/.<appName>/devtools/`
   * and global state under `${homedir()}/.<appName>/devtools/`. Pick the
   * devtool's id (or another stable, filesystem-safe identifier) so the
   * standalone host doesn't collide with other tools' storage.
   */
  appName: string
  /**
   * Workspace root used as the parent of the per-project storage
   * directory. Defaults to `process.cwd()`.
   */
  workspaceRoot?: string
}

/**
 * h3-backed {@link DevToolsHost} — used by the standalone CLI adapter.
 */
export function createH3DevToolsHost(options: CreateH3DevToolsHostOptions): DevToolsHost {
  const workspaceRoot = options.workspaceRoot ?? process.cwd()
  return {
    mountStatic(base, distDir) {
      return options.mount?.(base, distDir)
    },
    resolveOrigin() {
      return options.origin
    },
    getStorageDir(scope) {
      const namespace = `.${options.appName}/devtools`
      return scope === 'workspace'
        ? join(workspaceRoot, 'node_modules', namespace)
        : join(homedir(), namespace)
    },
  }
}
