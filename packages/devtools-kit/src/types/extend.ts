import type { Plugin } from 'vite'
import type { DevToolsPluginOptions } from './vite'

// Extend Vite's Plugin interface
declare module 'vite' {
  interface Plugin {
    devtools?: DevToolsPluginOptions
  }
}

export interface PluginWithDevtools extends Plugin {
  devtools?: DevToolsPluginOptions
}
