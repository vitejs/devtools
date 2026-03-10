import { fileURLToPath } from 'node:url'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import { resolveUiBase } from '../node'

const outDir = fileURLToPath(new URL('../../dist/ui', import.meta.url))
const unoConfig = fileURLToPath(new URL('../../uno.config.ts', import.meta.url))

export default defineConfig({
  base: resolveUiBase(),
  plugins: [
    UnoCSS({
      configFile: unoConfig,
    }),
  ],
  build: {
    outDir,
  },
})
