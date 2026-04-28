import { fileURLToPath } from 'node:url'
import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'
import { alias } from '../../../../alias'

export default defineConfig({
  base: './',
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: { alias },
  plugins: [preact()],
  build: {
    outDir: fileURLToPath(new URL('../../dist/client', import.meta.url)),
    emptyOutDir: true,
  },
})
