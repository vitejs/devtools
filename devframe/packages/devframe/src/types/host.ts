// DevToolsHost — abstraction over the runtime that serves the DevTools
// UI and RPC endpoints (Vite dev server, standalone h3 CLI server, static
// snapshot, embedded, etc.).
//
// Host classes (docks, views, ...) call into this interface so they stay
// framework-neutral. Concrete implementations live in each adapter:
//   - packages/kit/src/node/vite-host.ts — Vite-backed (dev mode)
//   - packages/devframe/src/node/host-h3.ts — h3 CLI server
//   - (build/spa/embedded) — added as the respective adapters land

export interface DevToolsHost {
  /**
   * Serve a static directory at the given URL base. Called by
   * `DevToolsViewHost.hostStatic`. Implementations map this to whatever
   * the underlying runtime expects (Vite middleware, h3 handler, no-op
   * for build snapshots).
   */
  mountStatic: (base: string, distDir: string) => void | Promise<void>

  /**
   * Return the public origin the host is reachable at, e.g.
   * `http://localhost:5173`. Used by the dock host to enrich remote
   * iframe URLs with a full `origin`. Called only when a dock needs an
   * absolute URL; hosts that never serve remote docks can return any
   * reasonable value.
   */
  resolveOrigin: () => string

  /**
   * Resolve a directory the host owns for persisted devtools state.
   * Each host picks its own app-name namespace so storage doesn't
   * collide between, say, the Vite host (`.vite/devtools`) and a
   * standalone CLI host (`.<appName>/devtools`).
   *
   *   - `workspace` — per-project state (settings, caches). Typically
   *     under `${workspaceRoot}/node_modules/.<appName>/devtools/`.
   *   - `global`    — per-user state (auth tokens, machine-wide
   *     preferences). Typically under
   *     `${homedir()}/.<appName>/devtools/`.
   *
   * Implementations should ensure the directory exists or be safe to
   * pass to a downstream `createStorage(...)` call that creates it
   * lazily.
   */
  getStorageDir: (scope: 'workspace' | 'global') => string
}
