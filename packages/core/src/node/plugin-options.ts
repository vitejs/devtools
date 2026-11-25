import type { TerminalsOptions } from '@devframes/plugin-terminals'
import type { DevToolsDocksUserSettings } from '@vitejs/devtools-kit'
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

/**
 * Panel settings the project sets, resolved below each developer's own choice.
 *
 * The three dock lists (`docksHidden`, `docksCategoriesHidden`, `docksPinned`)
 * are left out: the stored list is always present, so a seeded one could never
 * be undone from Settings. `commandShortcuts` takes an empty array to leave a
 * command unbound, e.g. `{ 'devframes:toggle-palette': [] }` for `Mod+K`.
 */
export type DevToolsSettingsDefaults = Omit<
  Partial<DevToolsDocksUserSettings>,
  'docksHidden' | 'docksCategoriesHidden' | 'docksPinned'
>

export interface ViteDevToolsUiOptions {
  branding?: DevToolsBranding
  embeddedVisibility?: DevToolsEmbeddedVisibility
  dockPreferences?: DevToolsDockPreferences
  settingsDefaults?: DevToolsSettingsDefaults
}

export type DevToolsBuiltinIntegrationId = 'rolldown' | 'vite' | 'vitest' | 'vite-task' | 'oxc'

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
   * Built-in integrations (Rolldown, Vite, Vitest, Vite Task, Oxc), including their install launchers.
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
  /**
   * Panel settings this project ships as its defaults, such as leaving `Mod+K`
   * unbound or ordering the dock bar. A developer's own choice in Settings
   * still wins, and a reset returns to these values.
   */
  settingsDefaults?: ViteDevToolsUiOptions['settingsDefaults']
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
