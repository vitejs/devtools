import process from 'node:process'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
// eslint-disable-next-line ts/ban-ts-comment
// @ts-ignore ignore the type error
import { DevToolsViteUI } from '../../vite/src/node'
import { DevTools } from '../src'
import { buildCSS } from '../src/client/webcomponents/scripts/build-css'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_DEVTOOLS_LOCAL_DEV': JSON.stringify(process.env.VITE_DEVTOOLS_LOCAL_DEV),
  },
  base: './',
  plugins: [
    Vue(),
    {
      name: 'build-css',
      handleHotUpdate({ file }) {
        if (file.endsWith('.vue') || file.endsWith('.css')) {
          buildCSS().catch(console.error)
        }
      },
    },

    // For local playground only. As a user you don't install this plugin directly.
    DevTools({
      builtinDevTools: false,
    }),
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
            url: 'https://antfu.me',
          })
        },
      },
    },
  ],
})
