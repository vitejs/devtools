// DevToolsHost — abstraction over the host runtime (Vite dev server, h3 CLI
// server, embedded context, etc.). Minimal surface for now; expanded as the
// adapter layer lands.

export interface DevToolsHost {
  /**
   * Serve static files at the given URL base. Implementations translate this
   * to whatever the underlying runtime expects (e.g. Vite middleware, h3
   * handler, no-op for build/snapshot).
   */
  mountStatic: (base: string, dir: string) => void | Promise<void>
}
