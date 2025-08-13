import type { Plugin } from 'vite'
import '@vitejs/devtools-kit'

export function DevToolsVite(): Plugin {
  return {
    name: 'vite:devtools',
    devtools: {
      setup(ctx) {
        ctx.views.register({
          name: 'Vite',
          icon: 'vite',
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
