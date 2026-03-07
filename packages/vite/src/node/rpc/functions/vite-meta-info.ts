import { defineRpcFunction } from '@vitejs/devtools-kit'

export const viteMetaInfo = defineRpcFunction({
  name: 'vite:meta-info',
  type: 'query',
  setup: (context) => {
    return {
      handler: async () => {
        const { root, base, plugins } = context.viteConfig

        return {
          root,
          base,
          plugins: plugins.map(p => p.name),
        }
      },
    }
  },
})
