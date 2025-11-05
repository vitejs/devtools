export interface DevToolsDockHost {
  views: Map<string, DevToolsDockEntry>
  register: (entry: DevToolsDockEntry) => void
  update: (entry: DevToolsDockEntry) => void
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

// TODO: refine categories more clearly
export type DevToolsDockEntryCategory = 'app' | 'framework' | 'web' | 'advanced' | 'default'

export interface DevToolsDockEntryBase {
  id: string
  title: string
  icon: string | { light: string, dark: string }
  /**
   * The default order of the entry in the dock.
   * The higher the number the earlier it appears.
   * @default 0
   */
  defaultOrder?: number
  /**
   * The category of the entry
   * @default 'default'
   */
  category?: DevToolsDockEntryCategory
}

export interface ClientScriptEntry {
  /**
   * The filepath or module name to import from
   */
  importFrom: string
  /**
   * The name to import the module as
   *
   * @default 'default'
   */
  importName?: string
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
  /**
   * Optional script to import into the iframe
   */
  import?: ClientScriptEntry
}

export interface DevToolsViewAction extends DevToolsDockEntryBase {
  type: 'action'
  import: ClientScriptEntry
}

export interface DevToolsViewCustomRender extends DevToolsDockEntryBase {
  type: 'custom-render'
  import: ClientScriptEntry
}

export type DevToolsDockEntry = DevToolsViewIframe | DevToolsViewAction | DevToolsViewCustomRender
