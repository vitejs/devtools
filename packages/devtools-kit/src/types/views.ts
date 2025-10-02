export interface DevToolsDockHost {
  register: (entry: DevToolsDockEntry) => void
  values: () => DevToolsDockEntry[]
}

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

export interface DevToolsDockEntryBase {
  id: string
  title: string
  icon: string
}

export interface DevToolsViewIframe extends DevToolsDockEntryBase {
  type: 'iframe'
  url: string
  /**
   * The id of the iframe, if multiple tabs is assigned with the same id, the iframe will be shared.
   *
   * When not provided, it would be treated as a unique frame.
   */
  frameId?: string
}

export interface DevToolsViewWebComponent extends DevToolsDockEntryBase {
  type: 'webcomponent'
  from: string
  import: string
}

export interface DevToolsViewAction extends DevToolsDockEntryBase {
  type: 'action'
  importFrom: string
  /**
   * @default 'default'
   */
  importName?: string
}

export type DevToolsDockEntry = DevToolsViewIframe | DevToolsViewWebComponent | DevToolsViewAction
