import { relative, resolve } from 'node:path'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { logger } from '../../diagnostics'

export const openInEditor = defineRpcFunction({
  name: 'vite:core:open-in-editor',
  type: 'action',
  setup: (context) => {
    return {
      handler: async (path: string) => {
        const resolved = resolve(context.workspaceRoot, path)
        const rel = relative(context.workspaceRoot, resolved)

        // Prevent escaping the workspace root
        if (rel.startsWith('..') || rel.includes('\0')) {
          throw logger.DTK0028().throw()
        }

        await import('launch-editor').then(r => r.default(resolved))
      },
    }
  },
})
