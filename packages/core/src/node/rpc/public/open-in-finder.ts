import { relative, resolve } from 'node:path'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { logger } from '../../diagnostics'

export const openInFinder = defineRpcFunction({
  name: 'vite:core:open-in-finder',
  type: 'action',
  setup: (context) => {
    return {
      handler: async (path: string) => {
        const resolved = resolve(context.workspaceRoot, path)
        const rel = relative(context.workspaceRoot, resolved)

        // Ensure the path stays within workspace root
        if (rel.startsWith('..') || rel.includes('\0')) {
          throw logger.DTK0029().throw()
        }

        await import('open').then(r => r.default(resolved))
      },
    }
  },
})
