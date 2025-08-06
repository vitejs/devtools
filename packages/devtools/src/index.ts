import type { Plugin } from 'vite'
import '@vitejs/devtools-kit'

export function ViteDevTools(): Plugin {
  return {
    name: 'vite:devtools',
    enforce: 'post',
    configureServer(_server) {
      // console.log(server)
    },
  }
}
