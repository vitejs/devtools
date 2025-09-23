import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'
import { buildCSS } from './src/webcomponents/scripts/build-css'

export default defineConfig([
  {
    entry: {
      webcomponents: 'src/webcomponents/index.ts',
    },
    plugins: [
      Vue({
        isProduction: true,
      }),
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
      'index': 'src/index.ts',
      'dirs': 'src/dirs.ts',
      'cli': 'src/node/cli.ts',
      'client-inject': 'src/client-inject/index.ts',
    },
    clean: false,
    tsconfig: '../../tsconfig.pkgs.json',
    dts: true,
    external: [
      '@vitejs/devtools/webcomponents',
    ],
    inputOptions: {
      experimental: {
        resolveNewUrlToAsset: false,
      },
    },
  },
])
