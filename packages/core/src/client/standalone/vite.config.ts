import { fileURLToPath } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import { createDevToolsContext } from '../../node/context'
import { createDevToolsMiddleware } from '../../node/server'

export default defineConfig({
  build: {
    outDir: fileURLToPath(new URL('../../../dist/client/standalone', import.meta.url)),
    emptyOutDir: true,
  },
  base: './',
  plugins: [
    Vue(),
    UnoCSS(),
    {
      name: 'setup',
      async configureServer(viteDevServer) {
        const context = await createDevToolsContext(viteDevServer.config, viteDevServer)
        const host = viteDevServer.config.server.host === true
          ? '0.0.0.0'
          : viteDevServer.config.server.host || 'localhost'
        const { middleware } = await createDevToolsMiddleware({
          cwd: viteDevServer.config.root,
          hostWebSocket: host,
          context,
        })
        viteDevServer.middlewares.use('/.devtools', middleware)
      },
    },
  ],
})
