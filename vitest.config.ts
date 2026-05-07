import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/*',
      'devframe/packages/*',
      'devframe/examples/devframe-files-inspector',
      'devframe/examples/devframe-streaming-chat',
      'devframe/tests',
      'test',
    ],
    testTimeout: 10000,
  },
})
