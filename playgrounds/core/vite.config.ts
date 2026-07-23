import process from 'node:process'
import { createInspectDevframe } from '@devframes/plugin-inspect'
import { createMessagesDevframe } from '@devframes/plugin-messages'
import { createTerminalsDevframe } from '@devframes/plugin-terminals'
import { createPluginFromDevframe, createSimpleClientScript } from '@vitejs/devtools-kit/node'
import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import Tracer from 'vite-plugin-vue-tracer'
import VueRouter from 'vue-router/vite'
import { alias } from '../../alias'
import { A11yCheckerPlugin } from '../../examples/plugin-a11y-checker/src/node'
import { GitUIPlugin } from '../../examples/plugin-git-ui/src/node'
import { DevTools } from '../../packages/core/src'
import { buildCSS } from '../../packages/core/src/client/webcomponents/scripts/build-css'
import { hideDockWhenEmpty } from '../../packages/core/src/node/plugins/auto-hide'
import { DevToolsOxc } from '../../packages/oxc/src/vite'
// eslint-disable-next-line ts/ban-ts-comment
// @ts-ignore ignore the type error
import { DevToolsRolldownUI } from '../../packages/rolldown/src/node'
import { DevToolsViteUI } from '../../packages/vite/src/node'
import { DevToolsVitestUI } from '../../packages/vitest/src/node'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcSharedStates {
    counter: { count: number }
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_DEVTOOLS_LOCAL_DEV': JSON.stringify(process.env.VITE_DEVTOOLS_LOCAL_DEV),
  },
  base: './',
  resolve: {
    alias,
  },
  plugins: [
    VueRouter(),
    Vue(),
    ...(() => {
      // Mirror the shipped `DevTools()` mounts (the playground runs with
      // `builtinDevTools: false`, so it re-creates them by hand): terminals
      // and messages auto-hide from the dock bar while empty.
      const terminalsDevframe = createTerminalsDevframe()
      const messagesDevframe = createMessagesDevframe()
      return [
        createPluginFromDevframe(terminalsDevframe, {
          dock: { category: '~builtin' },
          setup(ctx) {
            hideDockWhenEmpty(ctx, terminalsDevframe.id, () => ctx.terminals.sessions.size === 0)
          },
        }),
        createPluginFromDevframe(messagesDevframe, {
          dock: { category: '~builtin' },
          setup(ctx) {
            hideDockWhenEmpty(ctx, messagesDevframe.id, () => ctx.messages.entries.size === 0)
          },
        }),
      ]
    })(),
    createPluginFromDevframe(createInspectDevframe(), {
      dock: { category: '~builtin', icon: 'ph:stethoscope-duotone' },
    }),
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
    DevToolsRolldownUI(),
    DevToolsViteUI(),
    DevToolsVitestUI(),
    DevToolsOxc(),
    UnoCSS(),
    Tracer({
      viteDevtools: true,
    }),
    A11yCheckerPlugin(),
    GitUIPlugin(),
    {
      name: 'local',
      devtools: {
        async setup(ctx) {
          ctx.docks.register({
            type: 'action',
            action: createSimpleClientScript((ctx) => {
              // eslint-disable-next-line no-alert
              alert('Hello, world! For the first time!')
              ctx.current.events.on('entry:activated', () => {
                // eslint-disable-next-line no-alert
                alert('Hello, world!')
              })
            }),
            id: 'local2',
            title: 'Local2',
            groupId: 'playground',
            category: 'app',
            icon: 'ph:bell-simple-ringing-duotone',
          })

          ctx.docks.register({
            type: 'custom-render',
            renderer: createSimpleClientScript((ctx) => {
              ctx.current.events.on('dom:panel:mounted', (panel: any) => {
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
            groupId: 'playground',
            icon: 'ph:newspaper-clipping-duotone',
          })

          ctx.docks.register({
            id: 'counter',
            type: 'action',
            icon: 'material-symbols:counter-1',
            title: 'Counter',
            groupId: 'playground',
            category: 'app',
            // TODO: HMR
            action: createSimpleClientScript(() => {}),
          })

          ctx.docks.register({
            id: 'debug',
            type: 'iframe',
            url: '/devtools/',
            title: 'Debug Dashboard',
            icon: 'ph:bug-duotone',
            groupId: 'playground',
          })

          // Dogfood the remote dock feature: point at the docs-site demo page.
          // The page uses `connectRemoteDevTools()` to talk back to this server.
          // Override with DEVTOOLS_REMOTE_DEMO_URL (e.g. http://localhost:5174/kit/remote-demo
          // when running `pnpm -C docs docs` locally).
          ctx.docks.register({
            id: 'remote-demo',
            type: 'iframe',
            url: process.env.DEVTOOLS_REMOTE_DEMO_URL
              ?? 'https://devtools.vite.dev/kit/remote-demo',
            title: 'Remote Demo',
            icon: 'ph:cloud-duotone',
            groupId: 'playground',
            remote: true,
          })

          // Docked group: collapse several sub-tools under a single button.
          // Mirrors how a framework like Nuxt could surface its features as
          // individually-pluggable Vite DevTools entries under one umbrella.
          ctx.docks.register({
            id: 'nuxt',
            type: 'group',
            title: 'Nuxt',
            icon: 'vscode-icons:file-type-nuxt',
            category: 'framework',
            defaultChildId: 'nuxt:overview',
          })
          ctx.docks.register({
            id: 'playground',
            type: 'group',
            title: 'Playground',
            icon: 'ph:flask-duotone',
          })
          const nuxtFeatures = [
            ['nuxt:overview', 'Overview', 'ph:gauge-duotone'],
            ['nuxt:pages', 'Pages', 'ph:files-duotone'],
            ['nuxt:components', 'Components', 'ph:puzzle-piece-duotone'],
            ['nuxt:modules', 'Modules', 'ph:plugs-connected-duotone'],
          ] as const
          nuxtFeatures.forEach(([id, title, icon], index) => {
            ctx.docks.register({
              id,
              type: 'iframe',
              url: '/devtools/',
              title,
              icon,
              groupId: 'nuxt',
              defaultOrder: index,
            })
          })

          ctx.docks.register({
            id: 'launcher',
            type: 'launcher',
            icon: 'ph:rocket-launch-duotone',
            title: 'Launcher',
            groupId: 'playground',
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

          counterState.on('updated', (newState) => {
            ctx.docks.update({
              id: 'counter',
              type: 'action',
              groupId: 'playground',
              icon: `material-symbols:counter-${newState.count}`,
              title: `Counter ${newState.count}`,
              action: createSimpleClientScript(`() => {
                alert('Counter ${newState.count}')
              }`),
            })
          })

          // setInterval(() => {
          //   counterState.mutate((current) => {
          //     current.count = (current.count + 1) % 5
          //   })
          //   const count = counterState.value().count
          //   ctx.docks.update({
          //     id: 'counter',
          //     type: 'action',
          //     icon: `material-symbols:counter-${count}`,
          //     title: `Counter ${count}`,
          //     // TODO: HMR?
          //     action: createSimpleClientScript(`() => {
          //       alert('Counter ${count}')
          //     }`),
          //   })
          // }, 1000)
        },
      },
    },
  ],
})
