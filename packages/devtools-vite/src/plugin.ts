import type { PluginWithDevTools } from '@vitejs/devtools-kit'

export function DevToolsViteUI(): PluginWithDevTools {
  return {
    name: 'vite:devtools',
    devtools: {
      setup(ctx) {
        // eslint-disable-next-line no-console
        console.log('Vite DevTools Vite plugin setup')
        ctx.docks.register({
          id: 'vite',
          title: 'Vite',
          icon: 'https://vite.dev/logo.svg',
          type: 'iframe',
          url: 'http://localhost:3000',
        })
      },
    },
  }
}
