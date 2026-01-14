import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    dirs: 'src/dirs.ts',
  },
  /*
   * Since `lightningcss` is a dependency of vite, and devtools/vite -> devtools/kit -> devtools/core, lightningcss
   * would be bundled into the final build output, which would cause issues when used in environments where
   * lightningcss is expected to be an external dependency. https://github.com/parcel-bundler/lightningcss/issues/701
   */
  external: [
    'lightningcss',
  ],
  tsconfig: '../../tsconfig.base.json',
  target: 'esnext',
  exports: true,
  dts: true,
  clean: false,
  noExternal: [
    '@pnpm/read-project-manifest',
  ],
  inputOptions: {
    experimental: {
      resolveNewUrlToAsset: false,
    },
  },
})
