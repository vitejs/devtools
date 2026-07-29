// @ts-check
import antfu from '@antfu/eslint-config'
import nuxt from './packages/rolldown/src/.nuxt/eslint.config.mjs'

export default antfu({
  pnpm: true,
  ignores: [
    'skills',
    'plans',
    'e2e/fixtures/**/dist',
    'e2e/fixtures/**/.vite-devtools',
    // The production playground is a standalone workspace (its own
    // `pnpm-workspace.yaml`) that mirrors a real user install, so it uses plain
    // dependency specifiers rather than the repo catalog and stays out of the
    // repo-wide ESLint run.
    'playgrounds/production',
    // `packages/oxc` is DevTools for the Oxc toolchain and dogfoods its own
    // oxlint/oxfmt on itself, whose formatting (e.g. `arrowParens: "avoid"`)
    // conflicts with this shared antfu config, so it is linted by its own
    // toolchain (`pnpm -C packages/oxc lint`) rather than the repo-wide run.
    'packages/oxc',
    '!packages/oxc/package.json',
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
