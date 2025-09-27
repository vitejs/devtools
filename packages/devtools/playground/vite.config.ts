import { DevTools } from '@vitejs/devtools'
import { DevToolsViteUI } from '@vitejs/devtools-vite'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    Vue(),
    // For local playground only. As a user you don't install this plugin directly.
    DevTools(),
    DevToolsViteUI(),
    {
      name: 'local',
      devtools: {
        setup(ctx) {
          ctx.views.register({
            name: 'Local',
            icon: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg',
            viewId: 'local',
            view: {
              type: 'iframe',
              url: 'http://localhost:3000',
            },
          })
        },
      },
    },
  ],
})
