import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/node/index.ts',
  },
  clean: true,
  dts: true,
  format: 'esm',
  platform: 'node',
  exports: true,
})
