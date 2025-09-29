import process from 'node:process'
import { DevTools } from '@vitejs/devtools'
import { DevToolsViteUI } from '@vitejs/devtools-vite'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { buildCSS } from '../src/webcomponents/scripts/build-css'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_DEVTOOLS_LOCAL_DEV': JSON.stringify(process.env.VITE_DEVTOOLS_LOCAL_DEV),
  },
  plugins: [
    Vue(),
    {
      name: 'build-css',
      handleHotUpdate({ file }) {
        if (file.endsWith('.vue')) {
          buildCSS().catch(console.error)
        }
      },
    },

    // For local playground only. As a user you don't install this plugin directly.
    DevTools(),
    DevToolsViteUI(),
    {
      name: 'local',
      devtools: {
        setup(ctx) {
          ctx.docks.register({
            title: 'Local',
            icon: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg',
            id: 'local',
            type: 'iframe',
            url: 'http://localhost:3000',
          })
        },
      },
    },
  ],
})
