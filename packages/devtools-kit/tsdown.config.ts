import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client/index.ts',
  },
  exports: true,
  clean: true,
  tsconfig: '../../tsconfig.pkgs.json',
  dts: true,
})
