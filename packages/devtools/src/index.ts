import type { Plugin } from 'vite'
import { startStandaloneServer } from './node/server'
import '@vitejs/devtools-kit'

export function ViteDevTools(): Plugin {
  return {
    name: 'vite:devtools',
    enforce: 'post',
    configureServer(server) {
      startStandaloneServer({
        cwd: server.config.root,
        context: server.context,
        functions: server.context.rpc,
      })
      // console.log(server)
    },
  }
}
