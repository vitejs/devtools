import process from 'node:process'
import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import VueRouter from 'unplugin-vue-router/vite'
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
    VueRouter(),
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
        async setup(ctx) {
          ctx.docks.register({
            title: 'Local',
            icon: 'logos:vue',
            id: 'local',
            type: 'iframe',
            url: 'https://antfu.me',
          })

          ctx.docks.register({
            type: 'action',
            action: ctx.utils.createSimpleClientScript((ctx) => {
              // eslint-disable-next-line no-alert
              alert('Hello, world! For the first time!')
              ctx.current.events.on('entry:activated', () => {
                // eslint-disable-next-line no-alert
                alert('Hello, world!')
              })
            }),
            id: 'local2',
            title: 'Local2',
            icon: 'ph:bell-simple-ringing-duotone',
          })

          ctx.docks.register({
            type: 'custom-render',
            renderer: ctx.utils.createSimpleClientScript((ctx) => {
              ctx.current.events.on('dom:panel:mounted', (panel) => {
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
                panel.appendChild(el)
              })
            }),
            id: 'custom-render',
            title: 'Custom',
            icon: 'ph:newspaper-clipping-duotone',
          })

          ctx.docks.register({
            id: 'counter',
            type: 'action',
            icon: 'material-symbols:counter-1',
            title: 'Counter',
            // TODO: HMR
            action: ctx.utils.createSimpleClientScript(() => {}),
          })

          ctx.docks.register({
            id: 'devtools-tab',
            type: 'iframe',
            url: '/devtools/',
            title: 'DevTools',
            icon: 'ph:gear-duotone',
          })

          ctx.docks.register({
            id: 'launcher',
            type: 'launcher',
            icon: 'ph:rocket-launch-duotone',
            title: 'Launcher',
            launcher: {
              title: 'Launcher My Cool App',
              onLaunch: async () => {
                await ctx.terminals.startChildProcess({
                  command: 'vite',
                  args: ['dev'],
                  cwd: process.cwd(),
                }, {
                  id: 'vite-run',
                  title: 'Vite Run',
                })
                await new Promise(resolve => setTimeout(resolve, 1000))

                ctx.docks.update({
                  id: 'launcher',
                  icon: 'ph:rocket-launch-fill',
                  type: 'iframe',
                  title: 'My Cool App is Ready',
                  url: 'https://antfu.me',
                })
              },
            },
          })

          const counterState = await ctx.rpc.sharedState.get('counter', {
            initialValue: { count: 1 },
          })

          // eslint-disable-next-line unimport/auto-insert
          setInterval(() => {
            counterState.mutate((current) => {
              current.count = (current.count + 1) % 5
            })
            const count = counterState.value().count
            ctx.docks.update({
              id: 'counter',
              type: 'action',
              icon: `material-symbols:counter-${count}`,
              title: `Counter ${count}`,
              // TODO: HMR?
              action: ctx.utils.createSimpleClientScript(`() => {
                alert('Counter ${count}')
              }`),
            })
          }, 1000)
        },
      },
    },
  ],
})
