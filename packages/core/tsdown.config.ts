import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'
import { buildCSS } from './src/client/webcomponents/scripts/build-css'

const define = {
  'import.meta.env.VITE_DEVTOOLS_LOCAL_DEV': 'false',
  'process.env.VITE_DEVTOOLS_LOCAL_DEV': 'false',
}

export default defineConfig({
  exports: true,
  plugins: [
    Vue({
      isProduction: true,
    }),
  ],
  external: [
    '@vitejs/devtools/client/webcomponents',
    /^node:/,
  ],
  clean: true,
  platform: 'neutral',
  tsconfig: '../../tsconfig.base.json',
  entry: {
    'index': 'src/index.ts',
    'dirs': 'src/dirs.ts',
    'cli': 'src/node/cli.ts',
    'cli-commands': 'src/node/cli-commands.ts',
    'client/inject': 'src/client/inject/index.ts',
    'client/webcomponents': 'src/client/webcomponents/index.ts',
  },
  dts: true,
  inputOptions: {
    experimental: {
      resolveNewUrlToAsset: false,
    },
  },
  define,
  hooks: {
    'build:before': async function () {
      await buildCSS()
    },
  },
})
