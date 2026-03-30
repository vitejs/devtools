import { fileURLToPath } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const workspaceDir = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  base: './',
  plugins: [
    Vue(),
    UnoCSS(),
  ],
  server: {
    fs: {
      allow: [
        workspaceDir,
      ],
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: false,
    rolldownOptions: {
      input: {
        'devtools-panel': fileURLToPath(new URL('./app/panel/devtools-panel.html', import.meta.url)),
      },
    },
  },
  resolve: {
    dedupe: ['vue'],
  },
  root: rootDir,
})
