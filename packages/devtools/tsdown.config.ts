import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'
import { buildCSS } from './src/webcomponents/scripts/build-css'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/dirs.ts',
    'src/node/cli.ts',
    'src/webcomponents/index.ts',
    'src/client-inject/index.ts',
  ],
  clean: true,
  tsconfig: '../../tsconfig.pkgs.json',
  dts: true,
  plugins: [
    Vue({
      isProduction: true,
    }),
  ],
  hooks: {
    'build:before': async function () {
      await buildCSS()
    },
  },
  inputOptions: {
    experimental: {
      resolveNewUrlToAsset: false,
    },
  },
})
