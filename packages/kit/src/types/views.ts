export interface DevToolsViewHost {
  /**
   * @internal
   */
  buildStaticDirs: { baseUrl: string, distDir: string }[]
  /**
   * Helper to host static files
   * - In `dev` mode, it will register middleware to `viteServer.middlewares` to host the static files
   * - In `build` mode, it will copy the static files to the dist directory
   */
  hostStatic: (baseUrl: string, distDir: string) => void
}
