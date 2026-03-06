// @ts-check
import antfu from '@antfu/eslint-config'
import nuxt from './packages/rolldown/src/.nuxt/eslint.config.mjs'

export default antfu({
  pnpm: true,
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
  )
