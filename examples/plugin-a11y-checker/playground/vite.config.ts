import { fileURLToPath } from 'node:url'
import { DevTools } from '@vitejs/devtools'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import a11yChecker from '../src/node'

const unoConfig = fileURLToPath(new URL('../uno.config.ts', import.meta.url))

export default defineConfig({
  plugins: [
    DevTools({
      builtinDevTools: false,
    }),
    solid(),
    a11yChecker(),
    UnoCSS({
      configFile: unoConfig,
    }),
  ],
})
