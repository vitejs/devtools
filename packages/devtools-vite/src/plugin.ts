import type { PluginWithDevtools } from '@vitejs/devtools-kit'

export function DevToolsViteUI(): PluginWithDevtools {
  return {
    name: 'vite:devtools',
    devtools: {
      setup(ctx) {
        // eslint-disable-next-line no-console
        console.log('Vite DevTools Vite plugin setup')
        ctx.views.register({
          name: 'Vite',
          icon: 'https://vite.dev/logo.svg',
          viewId: 'vite',
          view: {
            type: 'iframe',
            url: 'http://localhost:3000',
          },
        })
      },
    },
  }
}
