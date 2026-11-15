import type { TerminalsOptions } from '@devframes/plugin-terminals'
import type { DevToolsConfig } from './config'

export type DevToolsBrandingLogo
  = | string
    | { light: string, dark: string }

export interface DevToolsBranding {
  productName?: string
  logo?: DevToolsBrandingLogo
  wordmark?: DevToolsBrandingLogo
  primaryColor?: string
  background?:
    | DevToolsBrandingLogo
    | {
      standalone: DevToolsBrandingLogo
      iframe?: DevToolsBrandingLogo
    }
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

export interface DevToolsDockRendererRegistration {
  type: string
  file: string
  importName?: string
}

export type DevToolsEmbeddedVisibility = 'normal' | 'passive' | 'hidden'

export interface ViteDevToolsUiOptions {
  branding?: DevToolsBranding
  embeddedVisibility?: DevToolsEmbeddedVisibility
  dockPreferences?: DevToolsDockPreferences
}

export type DevToolsBuiltinIntegrationId = 'rolldown' | 'vite' | 'vitest' | 'oxc'

export interface DevToolsBuiltinOptions {
  /**
   * Terminals panel. Pass options to configure it, e.g. a custom `shell` or `presets`.
   *
   * @default true
   */
  terminals?: boolean | TerminalsOptions
  /**
   * Messages panel.
   *
   * @default true
   */
  messages?: boolean
  /**
   * DevTools inspector panel.
   *
   * @default true
   */
  inspect?: boolean
  /**
   * Built-in integrations (Rolldown, Vite, Vitest, Oxc), including their install launchers.
   *
   * @default true
   */
  integrations?: boolean | Partial<Record<DevToolsBuiltinIntegrationId, boolean>>
}

export interface DevToolsUserOptions {
  /**
   * Include the Vite builtin devtools UI. Pass an object to toggle or configure
   * individual built-in panels; omitted entries stay enabled.
   *
   * @default true
   */
  builtinDevTools?: boolean | DevToolsBuiltinOptions
  /** Dock renderer modules, replacing built-ins with the same type and appending new types. */
  renderers?: readonly DevToolsDockRendererRegistration[]
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
    /**
     * Inject the dock into the built app. Requires `withApp: true`.
     * Ensure the DevTools assets are served under Vite's `base` when deployed.
     * @default false
     */
    injection?: boolean
    /** Output directory relative to root. Defaults to Vite's `build.outDir`. */
    outDir?: string
  }
}

export interface DevToolsOptions extends Omit<DevToolsConfig, 'enabled' | 'apply'> {
  /** Directory to search for installed integrations. */
  cwd?: string
}
