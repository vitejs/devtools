export type DevToolsBrandingLogo
  = | string
    | { light: string, dark: string }

export interface DevToolsBranding {
  productName?: string
  logo?: DevToolsBrandingLogo
  wordmark?: DevToolsBrandingLogo
  primaryColor?: string
  tagline?: string
  favicon?: string
  windowTitle?: string
}

export interface DevToolsDockPreferences {
  categoryOrder?: Record<string, number>
  maxVisibleItems?: number
  defaultMode?: 'float' | 'edge'
  defaultPosition?: 'left' | 'right' | 'top' | 'bottom'
}

export type DevToolsEmbeddedVisibility = 'normal' | 'passive' | 'hidden'

export interface ViteDevToolsUiOptions {
  branding?: DevToolsBranding
  embeddedVisibility?: DevToolsEmbeddedVisibility
  dockPreferences?: DevToolsDockPreferences
}

export interface DevToolsUserOptions {
  /**
   * Include the Vite builtin devtools UI.
   *
   * @default true
   */
  builtinDevTools?: boolean
  /** Override the branding handed to the DevTools client. */
  branding?: ViteDevToolsUiOptions['branding']
  /** Control how the embedded floating dock reveals itself. */
  embeddedVisibility?: ViteDevToolsUiOptions['embeddedVisibility']
  /** Configure the initial dock layout. */
  dockPreferences?: ViteDevToolsUiOptions['dockPreferences']
  /** Options for building static DevTools output alongside `vite build`. */
  build?: {
    /**
     * Automatically build DevTools when running `vite build`.
     * @default false
     */
    withApp?: boolean
    /** Output directory relative to root. Defaults to Vite's `build.outDir`. */
    outDir?: string
  }
}

export interface DevToolsOptions extends DevToolsUserOptions {
  /** Directory to search for installed integrations. */
  cwd?: string
}
