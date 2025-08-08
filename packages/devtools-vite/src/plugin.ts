import type { Plugin } from 'vite'
import '@vitejs/devtools-kit'

export function DevToolsVite(): Plugin {
  return {
    name: 'vite:devtools',
    devtools: {
      setup(ctx) {

      },
    },
  }
}
