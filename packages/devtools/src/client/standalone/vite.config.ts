import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import { createDevToolsContext } from '../../node/context'
import { createDevToolsMiddleware } from '../../node/server'

export default defineConfig({
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
      async configureServer(vite) {
        const context = await createDevToolsContext(vite.config)
        const { middleware } = await createDevToolsMiddleware({
          cwd: vite.config.root,
          context,
        })
        vite.middlewares.use('/__vite_devtools__', middleware)
      },
    },
  ],
})
