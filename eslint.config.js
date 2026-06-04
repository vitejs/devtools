// @ts-check
import antfu from '@antfu/eslint-config'
import nuxt from './packages/rolldown/src/.nuxt/eslint.config.mjs'

export default antfu({
  pnpm: true,
  ignores: [
    'skills',
    'e2e/fixtures/**/dist',
    'e2e/fixtures/**/.vite-devtools',
  ],
})
  .append(nuxt())
  .append({
    files: ['./packages/rolldown/src/node/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  })
  .removeRules(
    'vue/no-template-shadow',
    'pnpm/json-prefer-workspace-settings',
    'markdown/fenced-code-language',
    'e18e/prefer-static-regex',
    'e18e/prefer-spread-syntax',
  )
