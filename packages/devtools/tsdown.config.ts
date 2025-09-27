import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'
import { buildCSS } from './src/webcomponents/scripts/build-css'

export default defineConfig([
  {
    entry: {
      'client-inject': 'src/client-inject/index.ts',
      'webcomponents': 'src/webcomponents/index.ts',
    },
    plugins: [
      Vue({
        isProduction: true,
      }),
    ],
    external: [
      '@vitejs/devtools/webcomponents',
    ],
    clean: true,
    platform: 'neutral',
    tsconfig: '../../tsconfig.pkgs.json',
    hooks: {
      'build:before': async function () {
        await buildCSS()
      },
    },
  },
  {
    entry: {
      index: 'src/index.ts',
      dirs: 'src/dirs.ts',
      cli: 'src/node/cli.ts',
    },
    clean: false,
    tsconfig: '../../tsconfig.pkgs.json',
    dts: true,

    inputOptions: {
      experimental: {
        resolveNewUrlToAsset: false,
      },
    },
  },
])
