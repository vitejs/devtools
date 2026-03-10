import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { resolveUiBase } from '../node'

const outDir = fileURLToPath(new URL('../../dist/ui', import.meta.url))

export default defineConfig({
  base: resolveUiBase(),
  build: {
    outDir,
  },
})
