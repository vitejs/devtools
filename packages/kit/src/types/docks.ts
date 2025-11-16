// TODO: refine categories more clearly

export interface DevToolsDockHost {
  views: Map<string, DevToolsDockEntry>
  register: (entry: DevToolsDockEntry) => void
  update: (entry: DevToolsDockEntry) => void
  values: () => DevToolsDockEntry[]
}

export type DevToolsDockEntryCategory = 'app' | 'framework' | 'web' | 'advanced' | 'default'

export type DevToolsDockEntryIcon = string | { light: string, dark: string }

export interface DevToolsDockEntryBase {
  id: string
  title: string
  icon: DevToolsDockEntryIcon
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
   * Optional client script to import into the iframe
   */
  clientScript?: ClientScriptEntry
}

export type DevToolsViewLauncherStatus = 'idle' | 'loading' | 'success' | 'error'

export interface DevToolsViewLauncher extends DevToolsDockEntryBase {
  type: 'launcher'
  launcher: {
    icon?: DevToolsDockEntryIcon
    title: string
    status?: DevToolsViewLauncherStatus
    error?: string
    description?: string
    buttonStart?: string
    buttonLoading?: string
    onLaunch: () => Promise<void>
  }
}

export interface DevToolsViewAction extends DevToolsDockEntryBase {
  type: 'action'
  action: ClientScriptEntry
}

export interface DevToolsViewCustomRender extends DevToolsDockEntryBase {
  type: 'custom-render'
  renderer: ClientScriptEntry
}

export type DevToolsDockEntry = DevToolsViewIframe | DevToolsViewAction | DevToolsViewCustomRender | DevToolsViewLauncher
