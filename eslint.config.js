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
  .append({
    files: ['pnpm-workspace.yaml'],
    name: 'antfu/yaml/pnpm-workspace',
    rules: {
      'yaml/sort-keys': [
        'error',
        {
          order: [
            'packages',
            'overrides',
            'patchedDependencies',
            'hoistPattern',
            'catalog',
            'catalogs',

            'allowedDeprecatedVersions',
            'allowNonAppliedPatches',
            'configDependencies',
            'ignoredBuiltDependencies',
            'ignoredOptionalDependencies',
            'neverBuiltDependencies',
            'onlyBuiltDependencies',
            'onlyBuiltDependenciesFile',
            'packageExtensions',
            'peerDependencyRules',
            'supportedArchitectures',
          ],
          pathPattern: '^$',
        },
        {
          order: { type: 'asc' },
          pathPattern: '.*',
        },
      ],
    },
  })
