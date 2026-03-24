import { relative, resolve } from 'node:path'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const openInEditor = defineRpcFunction({
  name: 'vite:core:open-in-editor',
  type: 'action',
  setup: (context) => {
    return {
      handler: async (path: string) => {
        const resolved = resolve(context.cwd, path)
        const rel = relative(context.cwd, resolved)

        // Prevent escaping the root
        if (rel.startsWith('..') || rel.includes('\0')) {
          throw new Error('Path is outside the project root')
        }

        await import('launch-editor').then(r => r.default(resolved))
      },
    }
  },
})
