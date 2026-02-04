import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    dirs: 'src/dirs.ts',
  },
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
  inlineOnly: false,
})
