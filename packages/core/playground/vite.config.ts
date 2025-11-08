import process from 'node:process'
import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import Tracer from 'vite-plugin-vue-tracer'
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
    UnoCSS(),
    Tracer({
      viteDevtools: true,
    }),
    {
      name: 'local',
      devtools: {
        setup(ctx) {
          ctx.docks.register({
            title: 'Local',
            icon: 'logos:vue',
            id: 'local',
            type: 'iframe',
            url: 'https://antfu.me',
          })

          ctx.docks.register({
            type: 'action',
            action: ctx.utils.createSimpleClientScript(() => {
              // eslint-disable-next-line no-alert
              alert('Hello, world!')
            }),
            id: 'local2',
            title: 'Local2',
            icon: 'ph:bell-simple-ringing-duotone',
          })

          ctx.docks.register({
            type: 'custom-render',
            renderer: ctx.utils.createSimpleClientScript((ctx) => {
              if (!ctx.current.domElements.panel) {
                // eslint-disable-next-line no-alert
                alert('No panel element found!')
              }
              const el = document.createElement('div')
              el.style.padding = '16px'
              el.textContent = 'Hello from custom render dock!'

              const btn = document.createElement('button')
              btn.textContent = 'Click me'
              btn.onclick = () => {
                // eslint-disable-next-line no-alert
                alert('Button clicked in custom render dock!')
              }
              el.appendChild(btn)
              ctx.current.domElements.panel?.appendChild(el)
            }),
            id: 'custom-render',
            title: 'Custom',
            icon: 'ph:newspaper-clipping-duotone',
          })
        },
      },
    },
  ],
})
