import type { DevToolsMessageEntry } from '@vitejs/devtools-kit'

/**
 * A spread of message entries across every severity level, for the messages
 * panel and toast overlays. `autoDismiss: -1` keeps story toasts pinned so
 * they don't disappear mid-inspection.
 */
export function messagesFixture(): DevToolsMessageEntry[] {
  const now = Date.now()
  return [
    {
      id: 'msg-error',
      message: 'Failed to resolve import "vue-router"',
      description: 'The dependency could not be resolved from node_modules.',
      level: 'error',
      from: 'server',
      category: 'runtime',
      timestamp: now - 1000,
      autoDismiss: -1,
    },
    {
      id: 'msg-warn',
      message: 'Large chunk detected',
      description: 'index.js is 812 kB after minification. Consider code-splitting.',
      level: 'warn',
      from: 'server',
      category: 'build',
      labels: ['perf'],
      timestamp: now - 2000,
      autoDismiss: -1,
    },
    {
      id: 'msg-success',
      message: 'Build completed in 4.2s',
      level: 'success',
      from: 'server',
      category: 'build',
      timestamp: now - 3000,
      autoDismiss: -1,
    },
    {
      id: 'msg-info',
      message: 'HMR update applied',
      description: 'src/App.vue',
      level: 'info',
      from: 'browser',
      category: 'hmr',
      timestamp: now - 4000,
      autoDismiss: -1,
    },
  ]
}
