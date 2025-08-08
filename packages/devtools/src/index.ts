import type { Plugin } from 'vite'
import { startStandaloneServer } from './node/server'
import '@vitejs/devtools-kit'

export function ViteDevTools(): Plugin {
  return {
    name: 'vite:devtools',
    enforce: 'post',
    configureServer(server) {
      startStandaloneServer(server.config)
      // console.log(server)
    },
  }
}
