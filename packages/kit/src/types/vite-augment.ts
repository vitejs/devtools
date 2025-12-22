import type { Plugin } from 'vite'
import type { DevToolsPluginOptions } from './vite-plugin'

// Extend Vite's Plugin interface
declare module 'vite' {
  interface Plugin {
    devtools?: DevToolsPluginOptions
  }
  interface UserConfig {
    devtools?: ViteConfigDevtoolsOptions
  }
}

export interface ViteConfigDevtoolsOptions {
  /**
   * Disable client authentication.
   *
   * Beware that if you disable client authentication,
   * any browsers can connect to the devtools and access to your server and filesystem.
   * (including other devices, if you open server `host` option to LAN or WAN)
   *
   * @default true
   */
  clientAuth?: boolean
}

export interface PluginWithDevTools extends Plugin {
  devtools?: DevToolsPluginOptions
}
