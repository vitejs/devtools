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
}
