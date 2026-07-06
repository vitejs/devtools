import type { DevToolsTerminalSessionBase } from '@vitejs/devtools-kit'

export function terminalSessionsFixture(): DevToolsTerminalSessionBase[] {
  return [
    { id: 'vite-dev', title: 'vite dev', status: 'running', icon: 'ph:terminal-duotone' },
    { id: 'test-watch', title: 'vitest', status: 'running', icon: 'ph:test-tube-duotone' },
    { id: 'build', title: 'build', status: 'stopped', icon: 'ph:package-duotone' },
  ]
}

/** Scrollback buffer lines keyed by terminal id, served via `terminals:read`. */
export function terminalBuffers(): Record<string, string[]> {
  return {
    'vite-dev': [
      'VITE v8.1.2  ready in 312 ms',
      '',
      '  ➜  Local:   http://localhost:5173/',
      '  ➜  Network: use --host to expose',
      '  ➜  press h + enter to show help',
    ],
    'test-watch': [
      ' ✓ src/utils.test.ts (12 tests) 24ms',
      ' ✓ src/dock.test.ts (8 tests) 41ms',
      '',
      ' Test Files  2 passed (2)',
      '      Tests  20 passed (20)',
    ],
    'build': [
      'vite build',
      'transforming...',
      '✓ 284 modules transformed.',
      'dist/index.js  312.4 kB │ gzip: 98.1 kB',
      '✓ built in 4.20s',
    ],
  }
}
