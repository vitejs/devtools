import type { StorybookConfig } from '@storybook/vue3-vite'
import { fileURLToPath } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'
import { mergeConfig } from 'vite'
import { alias } from '../../alias'

const config: StorybookConfig = {
  // MDX before stories so the Overview can resolve component stories.
  stories: [
    '../stories/**/*.mdx',
    '../../packages/core/src/client/webcomponents/**/*.mdx',
    '../../packages/core/src/client/webcomponents/**/*.stories.@(ts|js)',
  ],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/vue3-vite',
    // The package ships raw .vue; disable docgen so it doesn't re-parse compiled output.
    options: { docgen: false },
  },
  viteFinal: base => mergeConfig(base, {
    resolve: { alias },
    plugins: [
      Vue(),
      Unocss({ configFile: fileURLToPath(new URL('../uno.config.ts', import.meta.url)) }),
    ],
    optimizeDeps: {
      exclude: [
        '@vitejs/devtools',
        '@vitejs/devtools-kit',
        '@vitejs/devtools-ui',
      ],
    },
  }),
}

export default config
