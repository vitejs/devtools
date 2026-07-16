import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/types/index.ts', 'src/vite.ts'],
  tsconfig: '../../tsconfig.base.json',
  dts: true,
  clean: false,
})
