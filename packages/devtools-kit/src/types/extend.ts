import type { DevToolsPluginOptions } from './vite'
import 'vite'

// Extend Vite's Plugin interface
declare module 'vite' {
  interface Plugin {
    devtools?: DevToolsPluginOptions
  }
}
