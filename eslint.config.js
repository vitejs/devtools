// @ts-check
import antfu from '@antfu/eslint-config'
import nuxt from './packages/devtools/src/.nuxt/eslint.config.mjs'

export default antfu({
  pnpm: true,
})
  .append(nuxt())
  .append({
    files: ['packages/devtools/src/node/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  })
