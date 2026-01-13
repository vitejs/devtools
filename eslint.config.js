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
  .append({
    files: [
      './packages/vite/src/app/composables/dark.ts',
      './packages/vite/src/app/composables/module-graph.ts',
      './packages/vite/src/app/composables/rpc.ts',
      './packages/vite/src/app/utils/color.ts',
      './packages/vite/src/app/utils/filepath.ts',
      './packages/vite/src/app/utils/icon.ts',
      './packages/vite/src/shared/types/data.ts',
      './packages/vite/src/shared/types/vite.ts',
    ],
    rules: {
      'unimport/auto-insert': 'off',
    },
  })
  .removeRules(
    'vue/no-template-shadow',
    'pnpm/json-prefer-workspace-settings',
  )
