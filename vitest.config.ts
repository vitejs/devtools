import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*', 'examples/devframe-files-inspector', 'test'],
    testTimeout: 10000,
  },
})
