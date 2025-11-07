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
        const { middleware } = await createDevToolsMiddleware({
          cwd: viteDevServer.config.root,
          context,
        })
        viteDevServer.middlewares.use('/.devtools', middleware)
      },
    },
  ],
})
