import { relative, resolve } from 'node:path'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const openInFinder = defineRpcFunction({
  name: 'vite:core:open-in-finder',
  type: 'action',
  setup: (context) => {
    return {
      handler: async (path: string) => {
        const resolved = resolve(context.cwd, path)
        const rel = relative(context.cwd, resolved)

        // Ensure the path stays within project root
        if (rel.startsWith('..') || rel.includes('\0')) {
          throw new Error('Path is outside the project root')
        }

        await import('launch-editor').then(r => r.default(resolved))
      },
    }
  },
})
