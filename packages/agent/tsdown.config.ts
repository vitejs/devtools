import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  tsconfig: '../../tsconfig.base.json',
  target: 'esnext',
  dts: true,
})
