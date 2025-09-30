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
      name: 'local',
      devtools: {
        setup(ctx) {
          ctx.docks.register({
            title: 'Local',
            icon: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg',
            id: 'local',
            type: 'iframe',
            url: 'https://antfu.me',
          })
        },
      },
    },
    {
      name: 'setup',
      async configureServer(viteDevServer) {
        const context = await createDevToolsContext(viteDevServer.config, viteDevServer)
        const { middleware } = await createDevToolsMiddleware({
          cwd: viteDevServer.config.root,
          context,
        })
        viteDevServer.middlewares.use('/__vite_devtools__', middleware)
      },
    },
  ],
})
