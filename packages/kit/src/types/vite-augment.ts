import type { Plugin } from 'vite'
import type { DevToolsPluginOptions } from './vite-plugin'

// Extend Vite's Plugin interface
declare module 'vite' {
  interface Plugin {
    devtools?: DevToolsPluginOptions
  }
}

export interface PluginWithDevTools extends Plugin {
  devtools?: DevToolsPluginOptions
}
