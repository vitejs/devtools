import type { StorybookConfig } from '@storybook/vue3-vite'
import { fileURLToPath } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { mergeConfig } from 'vite'
import { alias } from '../../../alias'

const config: StorybookConfig = {
  stories: [
    '../src/client/**/*.stories.@(ts|tsx)',
  ],
  addons: [],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  async viteFinal(base) {
    return mergeConfig(base, {
      define: {
        // The webcomponents entry branches on this flag to import the local
        // source instead of the published dist. Stories always run against
        // source, so pin it on.
        'import.meta.env.VITE_DEVTOOLS_LOCAL_DEV': JSON.stringify('true'),
      },
      resolve: {
        alias,
      },
      plugins: [
        Vue(),
        UnoCSS(fileURLToPath(new URL('./uno.config.ts', import.meta.url))),
      ],
    })
  },
}

export default config
