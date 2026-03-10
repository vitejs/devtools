import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/node/index.ts',
  },
  tsconfig: '../../tsconfig.base.json',
  clean: true,
  dts: true,
  format: 'esm',
  platform: 'node',
  exports: true,
  inlineOnly: false,
})
