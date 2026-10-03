import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})
