import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['typescript', 'vue', 'oxc'],
  rules: {
    'no-console': 'error',
  },
})
