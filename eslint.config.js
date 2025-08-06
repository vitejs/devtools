// @ts-check
import antfu from '@antfu/eslint-config'
import nuxt from './packages/devtools-vite/src/.nuxt/eslint.config.mjs'

export default antfu({
  pnpm: true,
})
  .append(nuxt())
  .append({
    files: ['packages/devtools-vite/src/node/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  })
