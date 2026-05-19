import { relative, resolve } from 'node:path'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { launchEditor } from 'devframe/utils/launch-editor'
import { diagnostics } from '../../diagnostics'

export const openInEditor = defineRpcFunction({
  name: 'vite:core:open-in-editor',
  type: 'action',
  jsonSerializable: true,
  setup: (context) => {
    return {
      handler: async (path: string) => {
        const resolved = resolve(context.cwd, path)
        const rel = relative(context.workspaceRoot, resolved)

        // Prevent escaping the workspace root
        if (rel.startsWith('..') || rel.includes('\0')) {
          throw diagnostics.DTK0028.throw()
        }

        launchEditor(resolved)
      },
    }
  },
})
