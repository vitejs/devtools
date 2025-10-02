// @ts-check
import antfu from '@antfu/eslint-config'
import nuxt from './packages/vite/src/.nuxt/eslint.config.mjs'

export default antfu({
  pnpm: true,
})
  .append(nuxt())
  .append({
    files: ['./packages/vite/src/node/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  })
